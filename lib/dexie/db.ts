import Dexie, { type Table } from 'dexie';
import { Note, Block, Link, Workspace, WorkspaceMember, WorkspaceInvite, Template, Database, Whiteboard } from '@/types/domain';
import { SyncQueueItem } from '@/types/sync';

export class SynapseDexieDB extends Dexie {
  notes!: Table<Note, string>;
  blocks!: Table<Block, string>;
  links!: Table<Link, string>;
  workspaces!: Table<Workspace, string>;
  workspace_members!: Table<WorkspaceMember, string>;
  workspace_invites!: Table<WorkspaceInvite, string>;
  templates!: Table<Template, string>;
  databases!: Table<Database, string>;
  whiteboards!: Table<Whiteboard, string>;
  sync_queue!: Table<SyncQueueItem, string>;

  constructor() {
    super('SynapseLocalDB');
    this.version(3).stores({
      notes: 'id, workspace_id, parent_id, updated_at, is_archived, is_favorite, title',
      blocks: 'id, note_id, workspace_id, sort_order, parent_block_id, updated_at, type',
      links: 'id, workspace_id, source_note_id, target_note_id',
      workspaces: 'id, slug',
      templates: 'id, workspace_id',
      databases: 'id, workspace_id',
      whiteboards: 'id, workspace_id',
      sync_queue: 'id, entityId, table, operation, createdAt, status',
    });
    this.version(4).stores({
      workspaces: 'id, slug, type',
      workspace_members: 'id, workspace_id, user_id, role, email',
      workspace_invites: 'id, workspace_id, invite_code, email',
    });
  }
}

export const localDb = new SynapseDexieDB();
