/**
 * Cross-Tab Realtime Synchronization for Synapse
 * Uses browser BroadcastChannel to instantly synchronize Dexie IndexedDB changes
 * across all open tabs in real-time (0ms cross-tab latency).
 */

export type TabSyncMessage =
  | { type: 'BLOCKS_MUTATED'; noteId: string }
  | { type: 'NOTE_MUTATED'; noteId: string; workspaceId: string }
  | { type: 'NOTES_CHANGED'; workspaceId: string }
  | { type: 'WORKSPACE_MUTATED'; workspaceId?: string };

type MessageListener = (msg: TabSyncMessage) => void;

class TabSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MessageListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('synapse_cross_tab_sync');
        this.channel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
          if (event.data && event.data.type) {
            this.listeners.forEach((listener) => {
              try {
                listener(event.data);
              } catch (err) {
                console.warn('[TabSync] Listener error:', err);
              }
            });
          }
        };
      } catch (err) {
        console.warn('[TabSync] BroadcastChannel initialization failed:', err);
      }
    }
  }

  /**
   * Broadcast an event to all other open tabs
   */
  broadcast(msg: TabSyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn('[TabSync] Failed to broadcast message:', err);
      }
    }
  }

  /**
   * Subscribe to messages from other tabs
   */
  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const tabSync = new TabSyncManager();

export function broadcastTabSync(msg: TabSyncMessage) {
  tabSync.broadcast(msg);
}
