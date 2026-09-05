import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/google/auth-user';
import {
  createGoogleSheetFromDatabase,
  createGoogleSheetFromNote,
  linkExistingGoogleSheet,
  executeTwoWaySheetSync,
} from '@/lib/google/sheets-sync-engine';

export async function POST(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    const body = await request.json();
    const { action, databaseId, noteId, workspaceId, googleSpreadsheetId, clientDatabase, clientNote, clientBlocks } = body;

    if (!databaseId && !noteId) {
      return NextResponse.json({ error: 'Missing databaseId or noteId' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    if (action === 'create') {
      if (noteId) {
        const result = await createGoogleSheetFromNote(
          userId,
          workspaceId,
          noteId,
          clientNote,
          clientBlocks
        );
        return NextResponse.json({ success: true, ...result });
      }

      const result = await createGoogleSheetFromDatabase(
        userId,
        workspaceId,
        databaseId,
        clientDatabase
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'link') {
      if (!googleSpreadsheetId) {
        return NextResponse.json({ error: 'Missing googleSpreadsheetId' }, { status: 400 });
      }
      const result = await linkExistingGoogleSheet(
        userId,
        workspaceId,
        databaseId,
        googleSpreadsheetId,
        clientDatabase
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'sync') {
      const result = await executeTwoWaySheetSync(userId, databaseId, clientDatabase);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'unlink') {
      if (databaseId) {
        await supabase.from('google_sheet_links').delete().eq('database_id', databaseId);
      } else if (noteId) {
        await supabase.from('google_sheet_links').delete().eq('note_id', noteId);
      }
      return NextResponse.json({ success: true, message: 'Unlinked from Google Sheets' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Google Sheets Sync API error:', err);
    return NextResponse.json({ error: err.message || 'Sheets sync operation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const databaseId = request.nextUrl.searchParams.get('databaseId');
  const noteId = request.nextUrl.searchParams.get('noteId');

  if (!databaseId && !noteId) {
    return NextResponse.json({ error: 'Missing databaseId or noteId' }, { status: 400 });
  }

  let query = supabase.from('google_sheet_links').select('*');
  if (databaseId) {
    query = query.eq('database_id', databaseId);
  } else if (noteId) {
    query = query.eq('note_id', noteId);
  }

  const { data: link } = await query.maybeSingle();

  return NextResponse.json({
    linked: Boolean(link),
    link: link || null,
  });
}
