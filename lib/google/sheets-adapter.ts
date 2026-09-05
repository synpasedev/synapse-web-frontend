import { sheets_v4 } from '@googleapis/sheets';
import { drive_v3 } from '@googleapis/drive';

export interface SpreadsheetData {
  title: string;
  sheetName: string;
  values: (string | number | boolean)[][];
}

export async function createGoogleSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  driveClient: drive_v3.Drive,
  title: string,
  headers: string[],
  rows: (string | number | boolean)[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const values: (string | number | boolean)[][] = [headers, ...rows];

  // 1. Create Spreadsheet
  const res = await sheetsClient.spreadsheets.create({
    requestBody: {
      properties: {
        title: title || 'Synapse Database',
      },
      sheets: [
        {
          properties: {
            title: 'Sheet1',
            gridProperties: {
              frozenRowCount: 1, // Freeze header row for clean UX
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;
  const spreadsheetUrl = res.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Write initial values (Header + Rows)
  if (values.length > 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    // 3. Format header row (Bold text + subtle background)
    try {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
                    textFormat: { bold: true },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length,
                },
              },
            },
          ],
        },
      });
    } catch (formatErr) {
      console.warn('[Google Sheets] Optional formatting failed, sheet still created:', formatErr);
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

export async function readGoogleSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<SpreadsheetData> {
  const meta = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const title = meta.data.properties?.title || 'Untitled Spreadsheet';
  const firstSheet = meta.data.sheets?.[0];
  const sheetName = firstSheet?.properties?.title || 'Sheet1';

  const rangeRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:ZZ`,
  });

  const values: (string | number | boolean)[][] = (rangeRes.data.values || []).map((row) =>
    row.map((cell: any) => (cell === undefined || cell === null ? '' : cell))
  );

  return {
    title,
    sheetName,
    values,
  };
}

export async function writeGoogleSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  headers: string[],
  rows: (string | number | boolean)[][],
  sheetName = 'Sheet1'
): Promise<void> {
  const values: (string | number | boolean)[][] = [headers, ...rows];

  // 1. Clear existing range to remove stale trailing rows
  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!A1:ZZ`,
  });

  // 2. Write new values
  if (values.length > 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  }
}

export async function listUserGoogleSpreadsheets(
  driveClient: drive_v3.Drive,
  query?: string
): Promise<Array<{ id: string; name: string; modifiedTime?: string; webViewLink?: string }>> {
  const searchFilter = query
    ? `mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and name contains '${query.replace(/'/g, "\\'")}'`
    : `mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;

  const res = await driveClient.files.list({
    q: searchFilter,
    pageSize: 30,
    fields: 'files(id, name, modifiedTime, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name || 'Untitled Spreadsheet',
    modifiedTime: f.modifiedTime || undefined,
    webViewLink: f.webViewLink || undefined,
  }));
}
