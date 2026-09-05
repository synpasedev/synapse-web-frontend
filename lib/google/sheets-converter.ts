import { Database, DatabaseProperty, DatabaseRow, Note, Block } from '@/types/domain';

export interface SheetGrid {
  headers: string[];
  rows: (string | number | boolean)[][];
}

/**
 * Converts a Synapse Database entity into a 2D sheet grid (headers + rows).
 */
export function databaseToSheetGrid(database: Database): SheetGrid {
  const properties = database.properties || [];
  const headers = properties.map((p) => p.name || 'Column');

  const rows: (string | number | boolean)[][] = (database.rows || []).map((row) => {
    return properties.map((prop) => {
      // Try prop.id first (e.g. 'p-title'), fallback to prop.name
      const raw = row.properties[prop.id] ?? row.properties[prop.name] ?? '';

      if (prop.type === 'checkbox') {
        const isChecked = Boolean(raw === true || raw === 'true' || raw === '[x]' || raw === 'TRUE');
        return isChecked ? 'TRUE' : 'FALSE';
      }

      if (Array.isArray(raw)) {
        return raw.join(', ');
      }

      if (typeof raw === 'object' && raw !== null) {
        return JSON.stringify(raw);
      }

      return raw ?? '';
    });
  });

  return { headers, rows };
}

/**
 * Converts a 2D sheet grid (values read from Google Sheets) back into Synapse DatabaseRow[] entities.
 * Automatically aligns with existing properties by name and detects boolean/checkbox values.
 */
export function sheetGridToDatabaseRows(
  database: Database,
  sheetValues: (string | number | boolean)[][]
): DatabaseRow[] {
  if (!sheetValues || sheetValues.length === 0) return [];

  const [headerRow, ...dataRows] = sheetValues;
  const sheetHeaders = (headerRow || []).map((h) => String(h || '').trim());

  // Map each sheet column index to a DatabaseProperty
  const colToPropMap = sheetHeaders.map((colName) => {
    return database.properties.find(
      (p) => p.name.toLowerCase() === colName.toLowerCase()
    );
  });

  return dataRows
    .filter((row) => row.some((cell) => cell !== '' && cell !== undefined && cell !== null))
    .map((row, rowIdx) => {
      const existingRow = database.rows?.[rowIdx];
      const properties: Record<string, any> = { ...(existingRow?.properties || {}) };

      sheetHeaders.forEach((colName, colIdx) => {
        const prop = colToPropMap[colIdx];
        const cellVal = row[colIdx] ?? '';
        const propKey = prop ? prop.id : `p-col-${colIdx}`;

        if (prop && prop.type === 'checkbox') {
          const str = String(cellVal).trim().toLowerCase();
          properties[propKey] = str === 'true' || str === '[x]' || str === '1' || cellVal === true;
        } else if (prop && prop.type === 'number') {
          const num = Number(cellVal);
          properties[propKey] = isNaN(num) ? cellVal : num;
        } else {
          properties[propKey] = cellVal;
        }
      });

      return {
        id: existingRow?.id || crypto.randomUUID(),
        database_id: database.id,
        properties,
        created_at: existingRow?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
}

/**
 * Converts Note to Sheet Grid (for exporting note tasks/checklists as spreadsheet rows).
 */
export function noteToSheetGrid(note: Note, blocks: Block[]): SheetGrid {
  const headers = ['Status', 'Task / Content', 'Block Type'];
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);

  const rows: (string | number | boolean)[][] = sorted.map((b) => {
    let text = '';
    if (typeof b.content?.text === 'string') {
      text = b.content.text;
    } else if (Array.isArray(b.content?.nodes)) {
      text = b.content.nodes.map((n: any) => n.text || '').join(' ');
    } else if (typeof b.content === 'string') {
      text = b.content;
    }

    const isTask =
      b.type === 'todo_list' ||
      (b.type as string) === 'taskItem' ||
      (b.properties && typeof b.properties.checked === 'boolean');

    if (isTask) {
      const isChecked = Boolean(b.properties?.checked || b.properties?.attrs?.checked);
      const cleanText = text.replace(/^\s*(?:[-*]\s+)?\[([ xX]?)\]\s*/, '');
      return [isChecked ? '[x]' : '[]', cleanText, 'Task'];
    }

    return ['', text, b.type];
  });

  return { headers, rows };
}
