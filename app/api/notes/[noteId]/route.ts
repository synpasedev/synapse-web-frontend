import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore } from '@/lib/server-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;

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
    serverStore.getNotes()[noteIndex] = updated;
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
  serverStore.getNotes()[noteIndex].is_archived = true;
  return NextResponse.json({ message: 'Note deleted successfully', id: noteId });
}
