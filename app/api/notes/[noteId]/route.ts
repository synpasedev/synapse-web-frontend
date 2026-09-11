import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore } from '@/lib/server-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('email');

  const localNote = serverStore.getNotes().find((n) => n.id === noteId);
  const wsId = localNote?.workspace_id;
  if (wsId && serverStore.isWorkspaceDeleted(wsId)) {
    return NextResponse.json({ error: 'Workspace has been deleted', workspaceDeleted: true }, { status: 410 });
  }
  if (wsId && userEmail && serverStore.isEvicted(wsId, userEmail)) {
    return NextResponse.json({ error: 'Access revoked', evicted: true }, { status: 403 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: note, error } = await supabase.from('notes').select('*').eq('id', noteId).single();
      if (!error && note) {
        const { data: blocks } = await supabase.from('blocks').select('*').eq('note_id', noteId).order('sort_order', { ascending: true });
        return NextResponse.json({ data: { ...note, blocks: blocks || [] } });
      }
    } catch (err) {
      // Fallback to local store
    }
  }

  const note = serverStore.getNotes().find((n) => n.id === noteId);
  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  const blocks = serverStore.getBlocks().filter((b) => b.note_id === noteId);
  return NextResponse.json({ data: { ...note, blocks } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;

  try {
    const updates = await request.json();

    const existingNote = serverStore.getNotes().find((n) => n.id === noteId);
    const wsId = updates.workspace_id || existingNote?.workspace_id;
    if (wsId && serverStore.isWorkspaceDeleted(wsId)) {
      return NextResponse.json({ error: 'Workspace has been deleted', workspaceDeleted: true }, { status: 410 });
    }
    const email = updates.author_email || updates.email || updates.updated_by;
    if (wsId && email && serverStore.isEvicted(wsId, email)) {
      return NextResponse.json(
        { error: 'Access revoked. You have been removed from this workspace.', evicted: true },
        { status: 403 }
      );
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
          .from('notes')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', noteId)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ data, message: 'Note updated successfully' });
        }
      } catch (err) {
        // Fallback
      }
    }

    const noteIndex = serverStore.getNotes().findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    const existing = serverStore.getNotes()[noteIndex];
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      version: (existing.version || 1) + 1,
    };
    serverStore.saveNote(updated);
    return NextResponse.json({ data: updated, message: 'Note updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from('notes').update({ is_archived: true }).eq('id', noteId);
      if (!error) {
        return NextResponse.json({ message: 'Note deleted successfully', id: noteId });
      }
    } catch (err) {
      // Fallback
    }
  }

  const noteIndex = serverStore.getNotes().findIndex((n) => n.id === noteId);
  if (noteIndex === -1) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  const existing = serverStore.getNotes()[noteIndex];
  serverStore.saveNote({ ...existing, is_archived: true });
  return NextResponse.json({ message: 'Note deleted successfully', id: noteId });
}
