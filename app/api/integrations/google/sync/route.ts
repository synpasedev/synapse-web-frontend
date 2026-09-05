import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  createGoogleDocFromNote,
  linkExistingGoogleDoc,
  executeTwoWaySync,
} from '@/lib/google/sync-engine';
import { getEffectiveUserId } from '@/lib/google/auth-user';

export async function POST(request: NextRequest) {
  const userId = await getEffectiveUserId();
  const supabase = await createServerSupabaseClient();

  try {
    const body = await request.json();
    const { action, noteId, workspaceId, googleDocId, clientNote, clientBlocks } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Missing noteId' }, { status: 400 });
    }

    if (action === 'create') {
      const result = await createGoogleDocFromNote(
        userId,
        workspaceId,
        noteId,
        clientNote,
        clientBlocks
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'link') {
      if (!googleDocId) {
        return NextResponse.json({ error: 'Missing googleDocId' }, { status: 400 });
      }
      const result = await linkExistingGoogleDoc(userId, workspaceId, noteId, googleDocId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'sync') {
      const result = await executeTwoWaySync(userId, noteId, clientNote, clientBlocks);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'unlink') {
      await supabase.from('google_doc_links').delete().eq('note_id', noteId);
      return NextResponse.json({ success: true, message: 'Unlinked from Google Docs' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Google Docs Sync API error:', err);
    return NextResponse.json({ error: err.message || 'Sync operation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const noteId = request.nextUrl.searchParams.get('noteId');
  if (!noteId) {
    return NextResponse.json({ error: 'Missing noteId' }, { status: 400 });
  }

  const { data: link } = await supabase
    .from('google_doc_links')
    .select('*')
    .eq('note_id', noteId)
    .maybeSingle();

  return NextResponse.json({
    linked: Boolean(link),
    link: link || null,
  });
}
