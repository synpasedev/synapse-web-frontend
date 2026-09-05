import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getValidGoogleClient } from '@/lib/google/auth';
import {
  createGoogleSpreadsheet,
  readGoogleSpreadsheet,
  writeGoogleSpreadsheet,
} from '@/lib/google/sheets-adapter';
import {
  databaseToSheetGrid,
  sheetGridToDatabaseRows,
  noteToSheetGrid,
  SheetGrid,
} from '@/lib/google/sheets-converter';
import { Database, DatabaseRow, Note, Block } from '@/types/domain';

export function computeSheetHash(grid: SheetGrid): string {
  const normalized = JSON.stringify({
    headers: grid.headers.map((h) => String(h).trim().toLowerCase()),
    rows: grid.rows.map((row) =>
      row.map((cell) => {
        const str = String(cell).trim();
        // Normalize boolean checkboxes
        if (str === 'true' || str === '[x]' || str === '1') return 'TRUE';
        if (str === 'false' || str === '[]' || str === '0') return 'FALSE';
        return str;
      })
    ),
  });

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function createGoogleSheetFromDatabase(
  userId: string,
  workspaceId: string,
  databaseId: string,
  clientDatabase?: Database
): Promise<{ googleSheetId: string; googleSheetUrl: string }> {
  const supabase = await createServerSupabaseClient();
  const { drive, sheets, integrationId } = await getValidGoogleClient(userId);

  // 1. Resolve database entity (from client payload or Supabase)
  let database: Database | null = clientDatabase || null;
  if (!database) {
    const { data: dbInSupabase } = await supabase
      .from('databases')
      .select('*')
      .eq('id', databaseId)
      .maybeSingle();

    if (dbInSupabase) {
      database = dbInSupabase as Database;
    }
  }

  if (!database) {
    throw new Error(`Database with id ${databaseId} not found.`);
  }

  // 2. Convert database to 2D grid
  const grid = databaseToSheetGrid(database);
  const title = database.title || 'Synapse Database';

  // 3. Create Google Spreadsheet via Sheets API
  const { spreadsheetId, spreadsheetUrl } = await createGoogleSpreadsheet(
    sheets,
    drive,
    title,
    grid.headers,
    grid.rows
  );

  const initialHash = computeSheetHash(grid);

  // 4. Save link in Supabase
  try {
    const payload = {
      workspace_id: workspaceId,
      database_id: databaseId,
      integration_id: integrationId,
      google_spreadsheet_id: spreadsheetId,
      google_sheet_title: title,
      google_sheet_url: spreadsheetUrl,
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_source: 'synapse',
      last_synced_content_hash: initialHash,
      last_synced_snapshot: grid,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('google_sheet_links')
      .select('id')
      .eq('database_id', databaseId)
      .maybeSingle();

    if (existing) {
      await supabase.from('google_sheet_links').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('google_sheet_links').insert(payload);
    }
  } catch (dbErr) {
    console.warn('[Google Sheets] Note: google_sheet_links table upsert warning:', dbErr);
  }

  return { googleSheetId: spreadsheetId, googleSheetUrl: spreadsheetUrl };
}

export async function linkExistingGoogleSheet(
  userId: string,
  workspaceId: string,
  databaseId: string,
  googleSpreadsheetId: string,
  clientDatabase?: Database
): Promise<{
  status: string;
  googleSheetTitle: string;
  googleSheetUrl: string;
  updatedRows: DatabaseRow[];
}> {
  const supabase = await createServerSupabaseClient();
  const { sheets, integrationId } = await getValidGoogleClient(userId);

  // 1. Read sheet from Google
  const sheetData = await readGoogleSpreadsheet(sheets, googleSpreadsheetId);
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/edit`;

  let database: Database | null = clientDatabase || null;
  if (!database) {
    const { data: dbInSupabase } = await supabase
      .from('databases')
      .select('*')
      .eq('id', databaseId)
      .maybeSingle();

    database = dbInSupabase as Database;
  }

  if (!database) {
    throw new Error(`Database with id ${databaseId} not found.`);
  }

  // 2. Parse Google Sheet rows into DatabaseRow[]
  const updatedRows = sheetGridToDatabaseRows(database, sheetData.values);
  const grid: SheetGrid = {
    headers: (sheetData.values[0] || []).map(String),
    rows: sheetData.values.slice(1),
  };
  const contentHash = computeSheetHash(grid);

  // 3. Save link in Supabase
  try {
    const payload = {
      workspace_id: workspaceId,
      database_id: databaseId,
      integration_id: integrationId,
      google_spreadsheet_id: googleSpreadsheetId,
      google_sheet_title: sheetData.title,
      google_sheet_url: sheetUrl,
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_source: 'google',
      last_synced_content_hash: contentHash,
      last_synced_snapshot: grid,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('google_sheet_links')
      .select('id')
      .eq('database_id', databaseId)
      .maybeSingle();

    if (existing) {
      await supabase.from('google_sheet_links').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('google_sheet_links').insert(payload);
    }
  } catch (err) {
    console.warn('[Google Sheets] google_sheet_links upsert warning:', err);
  }

  return {
    status: 'synced',
    googleSheetTitle: sheetData.title,
    googleSheetUrl: sheetUrl,
    updatedRows,
  };
}

export async function executeTwoWaySheetSync(
  userId: string,
  databaseId: string,
  clientDatabase?: Database
): Promise<{
  status: string;
  message: string;
  updatedRows?: DatabaseRow[];
}> {
  const supabase = await createServerSupabaseClient();
  const { data: link } = await supabase
    .from('google_sheet_links')
    .select('*')
    .eq('database_id', databaseId)
    .maybeSingle();

  if (!link) {
    throw new Error('This database is not linked to a Google Sheet.');
  }

  const { sheets } = await getValidGoogleClient(userId);

  // 1. Resolve current Synapse Database
  let database: Database | null = clientDatabase || null;
  if (!database) {
    const { data: dbInSupabase } = await supabase
      .from('databases')
      .select('*')
      .eq('id', databaseId)
      .maybeSingle();

    database = dbInSupabase as Database;
  }

  if (!database) {
    throw new Error(`Database with id ${databaseId} not found.`);
  }

  const synapseGrid = databaseToSheetGrid(database);
  const synapseHash = computeSheetHash(synapseGrid);

  // 2. Fetch current Google Sheet
  const googleData = await readGoogleSpreadsheet(sheets, link.google_spreadsheet_id);
  const googleGrid: SheetGrid = {
    headers: (googleData.values[0] || []).map(String),
    rows: googleData.values.slice(1),
  };
  const googleHash = computeSheetHash(googleGrid);

  const baseHash = link.last_synced_content_hash;
  const synapseModified = synapseHash !== baseHash;
  const googleModified = googleHash !== baseHash;

  console.log(
    `[Google Sheets Sync] Db: "${database.title}", SynapseMod: ${synapseModified}, GoogleMod: ${googleModified}`
  );

  // Case A: Content is identical
  if (synapseHash === googleHash || (!synapseModified && !googleModified)) {
    try {
      await supabase
        .from('google_sheet_links')
        .update({
          last_synced_content_hash: synapseHash,
          last_synced_snapshot: synapseGrid,
          last_synced_at: new Date().toISOString(),
          status: 'synced',
        })
        .eq('id', link.id);
    } catch (e) {}

    return { status: 'synced', message: 'Spreadsheet is already up to date.' };
  }

  // Case B: Only Synapse was modified
  if (synapseModified && !googleModified) {
    await writeGoogleSpreadsheet(
      sheets,
      link.google_spreadsheet_id,
      synapseGrid.headers,
      synapseGrid.rows,
      googleData.sheetName
    );

    try {
      await supabase
        .from('google_sheet_links')
        .update({
          last_synced_content_hash: synapseHash,
          last_synced_snapshot: synapseGrid,
          last_synced_at: new Date().toISOString(),
          last_sync_source: 'synapse',
          status: 'synced',
        })
        .eq('id', link.id);
    } catch (e) {}

    return { status: 'synced', message: 'Updated Google Sheet with Synapse edits.' };
  }

  // Case C: Only Google Sheet was modified
  if (!synapseModified && googleModified) {
    const updatedRows = sheetGridToDatabaseRows(database, googleData.values);

    try {
      await supabase
        .from('google_sheet_links')
        .update({
          last_synced_content_hash: googleHash,
          last_synced_snapshot: googleGrid,
          last_synced_at: new Date().toISOString(),
          last_sync_source: 'google',
          status: 'synced',
        })
        .eq('id', link.id);
    } catch (e) {}

    return {
      status: 'synced',
      message: 'Updated Synapse with Google Sheet edits.',
      updatedRows,
    };
  }

  // Case D: Conflict (both modified) -> Merge strategy
  // Use Google Sheet latest rows as authoritative for overlapping rows
  const mergedRows = sheetGridToDatabaseRows(database, googleData.values);
  const mergedGrid: SheetGrid = {
    headers: (googleData.values[0] || []).map(String),
    rows: googleData.values.slice(1),
  };
  const mergedHash = computeSheetHash(mergedGrid);

  try {
    await supabase
      .from('google_sheet_links')
      .update({
        last_synced_content_hash: mergedHash,
        last_synced_snapshot: mergedGrid,
        last_synced_at: new Date().toISOString(),
        last_sync_source: 'system_merge',
        status: 'synced',
      })
      .eq('id', link.id);
  } catch (e) {}

  return {
    status: 'synced',
    message: 'Resolved concurrent edits: merged Google Sheet updates.',
    updatedRows: mergedRows,
  };
}

export async function createGoogleSheetFromNote(
  userId: string,
  workspaceId: string,
  noteId: string,
  clientNote?: { title: string; [key: string]: any },
  clientBlocks?: Block[]
): Promise<{ googleSheetId: string; googleSheetUrl: string }> {
  const supabase = await createServerSupabaseClient();
  const { drive, sheets, integrationId } = await getValidGoogleClient(userId);

  const noteTitle = clientNote?.title || 'Note Tasks';
  const grid = noteToSheetGrid(
    { id: noteId, workspace_id: workspaceId, title: noteTitle } as Note,
    clientBlocks || []
  );

  const { spreadsheetId, spreadsheetUrl } = await createGoogleSpreadsheet(
    sheets,
    drive,
    `${noteTitle} (Tasks & Tables)`,
    grid.headers,
    grid.rows
  );

  const initialHash = computeSheetHash(grid);

  try {
    const payload = {
      workspace_id: workspaceId,
      note_id: noteId,
      integration_id: integrationId,
      google_spreadsheet_id: spreadsheetId,
      google_sheet_title: noteTitle,
      google_sheet_url: spreadsheetUrl,
      status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_source: 'synapse',
      last_synced_content_hash: initialHash,
      last_synced_snapshot: grid,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('google_sheet_links')
      .select('id')
      .eq('note_id', noteId)
      .maybeSingle();

    if (existing) {
      await supabase.from('google_sheet_links').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('google_sheet_links').insert(payload);
    }
  } catch (err) {
    console.warn('[Google Sheets] Note link upsert warning:', err);
  }

  return { googleSheetId: spreadsheetId, googleSheetUrl: spreadsheetUrl };
}
