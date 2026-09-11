import fs from 'fs';
import path from 'path';

// In-memory & disk-backed store for server-side REST API when running with or without cloud Supabase
export interface StoredNote {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  is_archived: boolean;
  is_favorite: boolean;
  version: number;
  created_by?: string;
  updated_by?: string;
  author_name?: string;
  author_email?: string;
  created_at: string;
  updated_at: string;
}

export interface StoredBlock {
  id: string;
  note_id: string;
  workspace_id: string;
  parent_block_id?: string | null;
  type: string;
  content: any;
  properties: any;
  sort_order: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StoredDatabase {
  id: string;
  workspace_id: string;
  title: string;
  properties: any[];
  rows: any[];
  created_at: string;
  updated_at: string;
}

export interface StoredWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  name?: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedSnapshot {
  id: string;          // e.g. "note-welcome"
  type: string;        // 'note' | 'canvas' | 'database'
  resource: any;       // the serialised resource object
  blocks?: any[];      // for notes: serialised blocks
  publishedAt: string;
  publisherName?: string;
}

declare global {
  var __synapse_notes: StoredNote[] | undefined;
  var __synapse_blocks: StoredBlock[] | undefined;
  var __synapse_databases: StoredDatabase[] | undefined;
  var __synapse_members: StoredWorkspaceMember[] | undefined;
  var __synapse_shares: Map<string, SharedSnapshot> | undefined;
}

// ---------------------------------------------------------------------------
// Serverless-safe disk persistence directory
// ---------------------------------------------------------------------------
function isServerlessReadOnly(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (typeof process !== 'undefined' && process.cwd && process.cwd().startsWith('/var/task'))
  );
}

function getDataDir(): string {
  if (isServerlessReadOnly()) {
    return path.join('/tmp', '.synapse-data');
  }
  return path.join(process.cwd(), '.synapse-data');
}

function ensureDataDir(): string | null {
  const primary = getDataDir();
  try {
    if (!fs.existsSync(primary)) {
      fs.mkdirSync(primary, { recursive: true });
    }
    return primary;
  } catch {
    try {
      const tmp = path.join('/tmp', '.synapse-data');
      if (!fs.existsSync(tmp)) {
        fs.mkdirSync(tmp, { recursive: true });
      }
      return tmp;
    } catch {
      return null;
    }
  }
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const dir = ensureDataDir();
  if (!dir) return fallback;
  const fp = path.join(dir, filename);
  try {
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'));
    }
  } catch {}
  return fallback;
}

function writeJsonFile<T>(filename: string, data: T): void {
  const dir = ensureDataDir();
  if (!dir) return;
  const fp = path.join(dir, filename);
  try {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn(`[server-store] Disk write warning (${filename}):`, err.message);
  }
}

// Initialise in-memory caches (hydrated from disk if available)
if (!global.__synapse_notes) {
  global.__synapse_notes = readJsonFile<StoredNote[]>('notes.json', [
    {
      id: 'note-welcome',
      workspace_id: 'ws-default-synapse',
      parent_id: null,
      title: 'Welcome to Synapse ⚡',
      icon: '🧠',
      is_archived: false,
      is_favorite: true,
      version: 1,
      author_name: 'Subhadeep',
      author_email: 'subhadeep@synapse.io',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'note-arch',
      workspace_id: 'ws-default-synapse',
      parent_id: null,
      title: 'Engineering Architecture RFC 🏛️',
      icon: '🏛️',
      is_archived: false,
      is_favorite: false,
      version: 1,
      author_name: 'Subhadeep',
      author_email: 'subhadeep@synapse.io',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

if (!global.__synapse_blocks) {
  global.__synapse_blocks = readJsonFile<StoredBlock[]>('blocks.json', [
    {
      id: 'block-welcome-1',
      note_id: 'note-welcome',
      workspace_id: 'ws-default-synapse',
      type: 'heading_1',
      content: { text: 'Welcome to Synapse' },
      properties: { level: 1 },
      sort_order: 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'block-welcome-2',
      note_id: 'note-welcome',
      workspace_id: 'ws-default-synapse',
      type: 'paragraph',
      content: { text: 'Your unified, local-first workspace for notes, graph links, and databases.' },
      properties: {},
      sort_order: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

if (!global.__synapse_databases) {
  global.__synapse_databases = readJsonFile<StoredDatabase[]>('databases.json', [
    {
      id: 'db-sprint-roadmap',
      workspace_id: 'ws-default-synapse',
      title: 'Sprint Roadmap & Milestones',
      properties: [
        { id: 'p-title', name: 'Task Name', type: 'text' },
        { id: 'p-status', name: 'Status', type: 'select' },
        { id: 'p-priority', name: 'Priority', type: 'select' },
        { id: 'p-due', name: 'Due Date', type: 'date' },
      ],
      rows: [
        {
          id: 'row-1',
          database_id: 'db-sprint-roadmap',
          properties: {
            'p-title': 'Ship Synapse v0.1 MVP',
            'p-status': 'In Progress',
            'p-priority': 'High',
            'p-due': '2026-09-15',
          },
          sort_order: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

if (!global.__synapse_members) {
  global.__synapse_members = readJsonFile<StoredWorkspaceMember[]>('members.json', []);
}

if (!global.__synapse_shares) {
  global.__synapse_shares = new Map();
}

export const serverStore = {
  // Notes
  getNotes: (workspaceId?: string): StoredNote[] => {
    const all = global.__synapse_notes || [];
    if (workspaceId) {
      return all.filter((n) => n.workspace_id === workspaceId);
    }
    return all;
  },

  saveNote: (note: StoredNote): StoredNote => {
    const all = global.__synapse_notes || [];
    const idx = all.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...note, updated_at: new Date().toISOString() };
    } else {
      all.unshift(note);
    }
    global.__synapse_notes = all;
    writeJsonFile('notes.json', all);
    return idx >= 0 ? all[idx] : note;
  },

  // Blocks
  getBlocks: (noteId?: string): StoredBlock[] => {
    const all = global.__synapse_blocks || [];
    if (noteId) {
      return all.filter((b) => b.note_id === noteId);
    }
    return all;
  },

  saveBlocks: (noteId: string, blocks: StoredBlock[], workspaceId?: string): StoredBlock[] => {
    const all = global.__synapse_blocks || [];
    // Remove old blocks for this note
    const kept = all.filter((b) => b.note_id !== noteId);
    const formattedBlocks = blocks.map((b, idx) => ({
      ...b,
      note_id: noteId,
      workspace_id: workspaceId || b.workspace_id || 'ws-default-synapse',
      sort_order: b.sort_order !== undefined ? b.sort_order : (idx + 1) * 1000,
      updated_at: b.updated_at || new Date().toISOString(),
    }));

    global.__synapse_blocks = [...kept, ...formattedBlocks];
    writeJsonFile('blocks.json', global.__synapse_blocks);
    return formattedBlocks;
  },

  // Databases
  getDatabases: (): StoredDatabase[] => global.__synapse_databases || [],

  // Workspace Members
  getWorkspaceMembers: (workspaceId: string): StoredWorkspaceMember[] => {
    const all = global.__synapse_members || [];
    return all.filter((m) => m.workspace_id === workspaceId);
  },

  saveWorkspaceMember: (member: StoredWorkspaceMember): StoredWorkspaceMember => {
    const all = global.__synapse_members || [];
    const cleanEmail = member.email.trim().toLowerCase();
    const existingIdx = all.findIndex(
      (m) => m.workspace_id === member.workspace_id && m.email.toLowerCase() === cleanEmail
    );

    if (existingIdx >= 0) {
      all[existingIdx] = {
        ...all[existingIdx],
        ...member,
        updated_at: new Date().toISOString(),
      };
    } else {
      all.push({
        ...member,
        created_at: member.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    global.__synapse_members = all;
    writeJsonFile('members.json', all);
    return existingIdx >= 0 ? all[existingIdx] : member;
  },

  // Share snapshots
  publishShare: (snapshot: SharedSnapshot) => {
    const key = `${snapshot.type}::${snapshot.id}`;
    global.__synapse_shares!.set(key, snapshot);
  },
  getShare: (type: string, id: string): SharedSnapshot | undefined => {
    const key = `${type}::${id}`;
    return global.__synapse_shares!.get(key);
  },
  listShares: (): SharedSnapshot[] => {
    return Array.from(global.__synapse_shares!.values());
  },
};
