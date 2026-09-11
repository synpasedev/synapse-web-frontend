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

  let dbBlocks: any[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('note_id', noteId)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        dbBlocks = data;
      }
    } catch (err) {
      // Fallback
    }
  }

  const serverBlocks = serverStore.getBlocks(noteId);
  const blockMap = new Map<string, any>();
  for (const b of serverBlocks) {
    blockMap.set(b.id, b);
  }
  for (const b of dbBlocks) {
    blockMap.set(b.id, b);
  }

  const combined = Array.from(blockMap.values()).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  return NextResponse.json({ data: combined, total: combined.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, workspaceId = 'ws-default-synapse', blocks = [] } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
    }

    const formatted = blocks.map((block: any, idx: number) => ({
      id: block.id || crypto.randomUUID(),
      note_id: noteId,
      workspace_id: workspaceId,
      type: block.type || 'paragraph',
      content: block.content || {},
      properties: block.properties || {},
      sort_order: block.sort_order !== undefined ? block.sort_order : (idx + 1) * 1000,
      created_by: block.created_by || block.author_name,
      updated_by: block.updated_by || block.author_name,
      author_name: block.author_name,
      author_email: block.author_email,
      created_at: block.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from('blocks').upsert(formatted);
      } catch (err) {
        // Fallback
      }
    }

    const saved = serverStore.saveBlocks(noteId, formatted, workspaceId);

    return NextResponse.json({ message: 'Blocks saved successfully', data: saved, count: saved.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
