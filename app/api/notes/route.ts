import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore, StoredNote } from '@/lib/server-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id') || 'ws-default-synapse';
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
    const defaultWorkspaceId = body.workspace_id || body.workspaceId || 'ws-default-synapse';

    const incomingNotes: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body.notes)
      ? body.notes
      : [body];

    if (incomingNotes.length === 0) {
      return NextResponse.json({ error: 'No notes provided' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const savedNotes: StoredNote[] = [];

    for (const item of incomingNotes) {
      const workspaceId = item.workspace_id || item.workspaceId || defaultWorkspaceId;

      if (serverStore.isWorkspaceDeleted(workspaceId)) {
        continue;
      }

      const email = item.author_email || item.email || body.author_email || body.email || body.userEmail;
      if (email && serverStore.isEvicted(workspaceId, email)) {
        continue;
      }

      const noteToSave: StoredNote = {
        id: item.id || `note-${crypto.randomUUID().slice(0, 8)}`,
        workspace_id: workspaceId,
        parent_id: item.parent_id !== undefined ? item.parent_id : (item.parentId || null),
        title: item.title !== undefined ? item.title : 'Untitled Note',
        icon: item.icon !== undefined ? item.icon : '📄',
        is_archived: Boolean(item.is_archived),
        is_favorite: Boolean(item.is_favorite),
        version: item.version || 1,
        author_name: item.author_name,
        author_email: item.author_email,
        created_by: item.created_by || 'system',
        updated_by: item.updated_by || 'system',
        created_at: item.created_at || now,
        updated_at: item.updated_at || now,
      };

      // Save to server store (memory + disk)
      const saved = serverStore.saveNote(noteToSave);
      savedNotes.push(saved);

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
    }

    if (savedNotes.length === 0 && incomingNotes.length > 0) {
      return NextResponse.json(
        { error: 'Workspace has been deleted or access was revoked' },
        { status: 403 }
      );
    }

    const isBatch = Array.isArray(body) || Array.isArray(body.notes);
    return NextResponse.json(
      {
        data: isBatch ? savedNotes : savedNotes[0],
        total: savedNotes.length,
        message: 'Note(s) saved successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
