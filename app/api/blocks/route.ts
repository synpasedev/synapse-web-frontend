import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { serverStore } from '@/lib/server-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json({ error: 'noteId parameter is required' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('note_id', noteId)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ data, total: data.length });
      }
    } catch (err) {
      // Fallback
    }
  }

  const blocks = serverStore.getBlocks().filter((b) => b.note_id === noteId);
  return NextResponse.json({ data: blocks, total: blocks.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, workspaceId = 'ws-default-synapse', blocks = [] } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.from('blocks').upsert(blocks).select();
        if (!error && data) {
          return NextResponse.json({ data, message: 'Blocks saved successfully' });
        }
      } catch (err) {
        // Fallback
      }
    }

    blocks.forEach((block: any) => {
      const existingIdx = serverStore.getBlocks().findIndex((b) => b.id === block.id);
      const formatted = {
        id: block.id || crypto.randomUUID(),
        note_id: noteId,
        workspace_id: workspaceId,
        type: block.type || 'paragraph',
        content: block.content || {},
        properties: block.properties || {},
        sort_order: block.sort_order || 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        serverStore.getBlocks()[existingIdx] = formatted;
      } else {
        serverStore.getBlocks().push(formatted);
      }
    });

    return NextResponse.json({ message: 'Blocks saved successfully', count: blocks.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
