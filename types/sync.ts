export type SyncOperation = 'UPSERT' | 'DELETE';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  table: 'notes' | 'blocks' | 'links' | 'templates' | 'workspaces';
  operation: SyncOperation;
  entityId: string;
  payload: any;
  createdAt: number;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
}
