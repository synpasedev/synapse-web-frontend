import { localDb } from './db';
import { SyncQueueItem, SyncState } from '@/types/sync';
import { createBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// Valid 100% hexadecimal UUID generator
function toValidUUID(val: any, fallback: string = '00000000-0000-0000-0000-000000000001'): string {
  if (!val || typeof val !== 'string') return fallback;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) return val;

  // Well-known seed aliases to deterministic valid hex UUIDs
  if (val === 'ws-default-synapse' || val === 'personal-brain') return 'a0000000-0000-0000-0000-000000000001';
  if (val === 'local-user' || val === 'local-user-1') return '00000000-0000-0000-0000-000000000001';
  if (val === 'note-welcome') return 'b0000000-0000-0000-0000-000000000001';
  if (val === 'note-architecture') return 'b0000000-0000-0000-0000-000000000002';
  if (val === 'note-graph-guide') return 'b0000000-0000-0000-0000-000000000003';
  if (val === 'note-ai-engine') return 'b0000000-0000-0000-0000-000000000004';

  // Compute deterministic valid hexadecimal hash
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    hash = (hash << 5) - hash + val.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
  return `00000000-0000-4000-8000-${hex}`;
}

function sanitizeForSupabase(table: string, payload: any, userId?: string): any {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };

  // Strip client-only fields that do not exist on remote Postgres schema
  delete clean.version;

  // Normalize all foreign keys and primary keys to valid hex UUID format for PostgreSQL
  if (clean.id) clean.id = toValidUUID(clean.id);
  if (clean.workspace_id) clean.workspace_id = toValidUUID(clean.workspace_id, 'a0000000-0000-0000-0000-000000000001');
  if (clean.note_id) clean.note_id = toValidUUID(clean.note_id);
  if (clean.parent_id) clean.parent_id = clean.parent_id ? toValidUUID(clean.parent_id) : null;
  if (clean.parent_block_id) clean.parent_block_id = clean.parent_block_id ? toValidUUID(clean.parent_block_id) : null;
  if (clean.created_by) clean.created_by = userId ? userId : toValidUUID(clean.created_by, '00000000-0000-0000-0000-000000000001');
  if (clean.updated_by) clean.updated_by = userId ? userId : toValidUUID(clean.updated_by, '00000000-0000-0000-0000-000000000001');
  if (clean.owner_id) clean.owner_id = userId ? userId : toValidUUID(clean.owner_id, '00000000-0000-0000-0000-000000000001');

  // Ensure JSON fields are properly formatted
  if (clean.content && typeof clean.content !== 'object') {
    clean.content = { text: String(clean.content) };
  }
  if (clean.properties && typeof clean.properties !== 'object') {
    clean.properties = {};
  }

  return clean;
}

class SyncEngine {
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Array<(state: SyncState) => void> = [];
  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncEngine] 🌐 Network online event detected -> triggering flush');
        this.updateState({ isOnline: true });
        this.scheduleFlush(300);
      });
      window.addEventListener('offline', () => {
        console.log('[SyncEngine] 📴 Network offline event detected -> local mode active');
        this.updateState({ isOnline: false });
      });
    }
  }

  subscribe(listener: (state: SyncState) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(updates: Partial<SyncState>) {
    const hasChanges = Object.entries(updates).some(
      ([key, val]) => (this.state as any)[key] !== val
    );
    if (!hasChanges) return;

    this.state = { ...this.state, ...updates };
    this.listeners.forEach((l) => l(this.state));
  }

  /**
   * Schedule a debounced flush so continuous typing/mutations don't cause constant sync flushes
   */
  scheduleFlush(delayMs: number = 800) {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, delayMs);
  }

  /**
   * Safe idempotent single item enqueue
   */
  async enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'> & { clientMutationId?: string }) {
    await this.enqueueBatch([item]);
  }

  /**
   * Safe idempotent batch enqueue: coalesces updates for the same entities and debounces flush
   */
  async enqueueBatch(items: Array<Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'retryCount'> & { clientMutationId?: string }>) {
    if (!items || items.length === 0) return;

    try {
      const now = Date.now();
      const queueItems: SyncQueueItem[] = [];

      for (const item of items) {
        let existing: SyncQueueItem | undefined;
        try {
          existing = await localDb.sync_queue
            .where('entityId')
            .equals(item.entityId)
            .and((q) => q.status === 'PENDING' && q.table === item.table)
            .first();
        } catch {
          // fallback if compound index is missing
          const allPending = await localDb.sync_queue.toArray();
          existing = allPending.find(
            (q) => q.entityId === item.entityId && q.status === 'PENDING' && q.table === item.table
          );
        }

        queueItems.push({
          ...item,
          id: existing ? existing.id : (item.clientMutationId || crypto.randomUUID()),
          createdAt: now,
          status: 'PENDING',
          retryCount: 0,
        });
      }

      await localDb.sync_queue.bulkPut(queueItems);
      const count = await localDb.sync_queue.where('status').equals('PENDING').count();
      this.updateState({ pendingCount: count });

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.scheduleFlush(800);
      }
    } catch (enqueueErr: any) {
      console.warn('[SyncEngine] Non-critical queue batch enqueue warning:', enqueueErr.message);
    }
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.isFlushing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    this.isFlushing = true;

    try {
      const pendingItems = await localDb.sync_queue
        .where('status')
        .equals('PENDING')
        .sortBy('createdAt');

      if (!pendingItems.length) {
        this.updateState({ isSyncing: false, pendingCount: 0 });
        return;
      }

      // If Supabase is not configured, drain queue locally without flickering isSyncing
      if (!isSupabaseConfigured()) {
        await localDb.sync_queue.bulkDelete(pendingItems.map((i) => i.id));
        this.updateState({
          isSyncing: false,
          pendingCount: 0,
          lastSyncedAt: Date.now(),
        });
        return;
      }

      const supabase = createBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      // If user is operating in Local-First Guest mode (not authenticated with Supabase account),
      // mutations are already persisted in IndexedDB. Drain without flickering isSyncing.
      if (!session?.user) {
        await localDb.sync_queue.bulkDelete(pendingItems.map((i) => i.id));
        this.updateState({
          isSyncing: false,
          pendingCount: 0,
          lastSyncedAt: Date.now(),
        });
        return;
      }

      // User has active cloud session: trigger smooth cloud syncing state
      this.updateState({ isSyncing: true });
      const syncStartTime = Date.now();

      console.log(`[SyncEngine] 🚀 Processing ${pendingItems.length} pending mutations for user ${session.user.id}`);
      const userId = session.user.id;

      for (const item of pendingItems) {
        try {
          const sanitizedPayload = sanitizeForSupabase(item.table, item.payload, userId);
          const sanitizedEntityId = toValidUUID(item.entityId);

          console.log(`[SyncEngine] 🛰️ Remote push: ${item.operation} on ${item.table} (${sanitizedEntityId})`);

          if (item.operation === 'UPSERT') {
            const { error } = await supabase.from(item.table).upsert(sanitizedPayload);
            if (error) throw error;
          } else if (item.operation === 'DELETE') {
            const { error } = await supabase.from(item.table).delete().eq('id', sanitizedEntityId);
            if (error) throw error;
          }
          await localDb.sync_queue.delete(item.id);
        } catch (err: any) {
          console.warn(`[SyncEngine] ⚠️ Sync item ${item.id} retry error:`, err.message);
          if (item.retryCount >= 2) {
            await localDb.sync_queue.delete(item.id);
          } else {
            await localDb.sync_queue.update(item.id, {
              retryCount: item.retryCount + 1,
              lastError: err.message,
            });
          }
        }
      }

      // Maintain minimum display time so cloud sync doesn't cause a micro-strobe
      const elapsed = Date.now() - syncStartTime;
      const MIN_SYNC_DISPLAY_MS = 600;
      if (elapsed < MIN_SYNC_DISPLAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SYNC_DISPLAY_MS - elapsed));
      }

      const remaining = await localDb.sync_queue.where('status').equals('PENDING').count();
      this.updateState({
        isSyncing: false,
        pendingCount: remaining,
        lastSyncedAt: Date.now(),
      });
      console.log(`[SyncEngine] ✓ Sync complete. Remaining pending: ${remaining}`);
    } catch (globalErr: any) {
      console.warn('[SyncEngine] Sync flush encountered an error:', globalErr.message);
    } finally {
      this.isFlushing = false;
      this.updateState({ isSyncing: false });
    }
  }
}

export const syncEngine = new SyncEngine();
