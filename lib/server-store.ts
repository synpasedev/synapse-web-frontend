// In-memory store for server-side REST API when running without cloud Supabase
export interface StoredNote {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  is_archived: boolean;
  is_favorite: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StoredBlock {
  id: string;
  note_id: string;
  workspace_id: string;
  type: string;
  content: any;
  properties: any;
  sort_order: number;
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

declare global {
  var __synapse_notes: StoredNote[] | undefined;
  var __synapse_blocks: StoredBlock[] | undefined;
  var __synapse_databases: StoredDatabase[] | undefined;
}

if (!global.__synapse_notes) {
  global.__synapse_notes = [
    {
      id: 'note-welcome',
      workspace_id: 'ws-default-synapse',
      parent_id: null,
      title: 'Welcome to Synapse ⚡',
      icon: '🧠',
      is_archived: false,
      is_favorite: true,
      version: 1,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

if (!global.__synapse_blocks) {
  global.__synapse_blocks = [
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
  ];
}

if (!global.__synapse_databases) {
  global.__synapse_databases = [
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
  ];
}

export const serverStore = {
  getNotes: () => global.__synapse_notes || [],
  getBlocks: () => global.__synapse_blocks || [],
  getDatabases: () => global.__synapse_databases || [],
};
