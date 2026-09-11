import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore, StoredNote } from '@/lib/server-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') || 'ws-default-synapse';
  const userEmail = searchParams.get('email');

  if (serverStore.isWorkspaceDeleted(workspaceId)) {
    return NextResponse.json(
      { error: 'Workspace has been deleted', workspaceDeleted: true },
      { status: 410 }
    );
  }

  if (userEmail && serverStore.isEvicted(workspaceId, userEmail)) {
    return NextResponse.json(
      { error: 'Access revoked. You have been removed from this workspace.', evicted: true },
      { status: 403 }
    );
  }

  const notesMap = new Map<string, StoredNote>();

  // 1. Get from server store
  const localNotes = serverStore.getNotes(workspaceId).filter((n) => !n.is_archived);
  localNotes.forEach((n) => notesMap.set(n.id, n));

  // 2. Fetch from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((item: any) => {
          notesMap.set(item.id, {
            id: item.id,
            workspace_id: item.workspace_id,
            parent_id: item.parent_id,
            title: item.title,
            icon: item.icon,
            is_archived: item.is_archived || false,
            is_favorite: item.is_favorite || false,
            version: item.version || 1,
            created_by: item.created_by,
            updated_by: item.updated_by,
            created_at: item.created_at,
            updated_at: item.updated_at,
          });
        });
      }
    } catch (err) {
      // Fallback to server store
    }
  }

  const notes = Array.from(notesMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return NextResponse.json({ data: notes, total: notes.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      workspaceId = 'ws-default-synapse',
      title = 'Untitled Note',
      icon = '📄',
      parentId = null,
      is_favorite = false,
      is_archived = false,
      author_name,
      author_email,
      created_by,
      updated_by,
      version = 1,
    } = body;

    const now = new Date().toISOString();

    if (serverStore.isWorkspaceDeleted(workspaceId)) {
      return NextResponse.json(
        { error: 'Workspace has been deleted', workspaceDeleted: true },
        { status: 410 }
      );
    }

    const email = author_email || body.email || body.userEmail;
    if (email && serverStore.isEvicted(workspaceId, email)) {
      return NextResponse.json(
        { error: 'Access revoked. You have been removed from this workspace.', evicted: true },
        { status: 403 }
      );
    }

    const noteToSave: StoredNote = {
      id: id || `note-${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      parent_id: parentId,
      title,
      icon,
      is_archived,
      is_favorite,
      version,
      author_name,
      author_email,
      created_by: created_by || 'system',
      updated_by: updated_by || 'system',
      created_at: body.created_at || now,
      updated_at: body.updated_at || now,
    };

    // Save to server store (memory + disk)
    const saved = serverStore.saveNote(noteToSave);

    // Also attempt Supabase upsert
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('notes').upsert({
          id: noteToSave.id,
          workspace_id: noteToSave.workspace_id,
          parent_id: noteToSave.parent_id,
          title: noteToSave.title,
          icon: noteToSave.icon,
          is_archived: noteToSave.is_archived,
          is_favorite: noteToSave.is_favorite,
          version: noteToSave.version,
          created_at: noteToSave.created_at,
          updated_at: noteToSave.updated_at,
        });
      } catch (err) {
        // Fallback
      }
    }

    return NextResponse.json({ data: saved, message: 'Note saved successfully' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
