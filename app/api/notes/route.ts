import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore } from '@/lib/server-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId') || 'ws-default-synapse';

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
        return NextResponse.json({ data, total: data.length });
      }
    } catch (err) {
      // Fallback to local store if table doesn't exist yet on remote Supabase
    }
  }

  const notes = serverStore.getNotes().filter((n) => n.workspace_id === workspaceId && !n.is_archived);
  return NextResponse.json({ data: notes, total: notes.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId = 'ws-default-synapse', title = 'Untitled Note', icon = '📄', parentId = null } = body;

    const newNote = {
      id: `note-${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      parent_id: parentId,
      title,
      icon,
      is_archived: false,
      is_favorite: false,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.from('notes').insert(newNote).select().single();
        if (!error && data) {
          return NextResponse.json({ data, message: 'Note created successfully' }, { status: 201 });
        }
      } catch (err) {
        // Fallback to local store
      }
    }

    serverStore.getNotes().unshift(newNote);
    return NextResponse.json({ data: newNote, message: 'Note created successfully' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
