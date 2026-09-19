import { localDb } from '@/lib/dexie/db';
import { broadcastTabSync } from '@/lib/dexie/tab-sync';
import { Note, Block } from '@/types/domain';

export type RealtimeEventType =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'SYNC_TICK'
  | 'SYNC_FULL'
  | 'NOTE_UPDATED'
  | 'BLOCKS_UPDATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'COLLISION_ALERT'
  | 'COLLISION_CLEAR'
  | 'PRESENCE_UPDATED';

export interface ActiveEditorPresence {
  user: { id?: string; name?: string; email?: string };
  activeBlockIndex: number;
  activeBlockId?: string | null;
  lastActivity: number;
  isTyping?: boolean;
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  workspaceId?: string;
  noteId?: string;
  note?: Note;
  notes?: Note[];
  blocks?: Block[];
  user?: any;
  users?: any[];
  activeBlockIndex?: number;
  activeEditors?: ActiveEditorPresence[];
  activeMembers?: number;
  timestamp?: number;
}

type Listener = (event: RealtimeEvent) => void;

class SynapseRealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private noteListeners: Map<string, Set<Listener>> = new Map();
  private currentWorkspaceId: string = '';
  private currentActiveNoteId: string = '';
  private currentUser: { name?: string; email?: string; id?: string } | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private _isConnected: boolean = false;
  private lastSyncTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Direct 0ms note-level event subscription for BlockEditor.
   * Receives BLOCKS_UPDATED, COLLISION_ALERT, COLLISION_CLEAR, and PRESENCE_UPDATED instantly.
   */
  public subscribeToNote(noteId: string, listener: Listener): () => void {
    if (!this.noteListeners.has(noteId)) {
      this.noteListeners.set(noteId, new Set());
    }
    this.noteListeners.get(noteId)!.add(listener);
    return () => {
      const set = this.noteListeners.get(noteId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.noteListeners.delete(noteId);
        }
      }
    };
  }

  private notify(event: RealtimeEvent) {
    // 1. Notify global workspace listeners
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch (e) {
        console.error('[RealtimeClient] Global listener error:', e);
      }
    });

    // 2. Fast-path notify note-specific listeners
    if (event.noteId && this.noteListeners.has(event.noteId)) {
      this.noteListeners.get(event.noteId)!.forEach((l) => {
        try {
          l(event);
        } catch (e) {
          console.error('[RealtimeClient] Note listener error:', e);
        }
      });
    }
  }

  private getWsUrl(): string {
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const protocol = isHttps ? 'wss:' : 'ws:';
      const hostname = window.location.hostname || 'localhost';
      return `${protocol}//${hostname}:3001`;
    }
    return 'ws://localhost:3001';
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      const url = this.getWsUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._isConnected = true;
        this.notify({ type: 'CONNECTED', timestamp: Date.now() });

        // If we were already in a workspace, re-join immediately
        if (this.currentWorkspaceId) {
          this.joinWorkspace(this.currentWorkspaceId, this.currentUser || undefined);
        }

        // If active in a note, re-join note room
        if (this.currentActiveNoteId && this.currentWorkspaceId) {
          this.joinNote(this.currentWorkspaceId, this.currentActiveNoteId, this.currentUser || undefined);
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleIncomingMessage(msg);
        } catch (e) {
          console.warn('[RealtimeClient] JSON parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.notify({ type: 'DISCONNECTED', timestamp: Date.now() });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.init();
    }, 2000);
  }

  public joinWorkspace(workspaceId: string, user?: { name?: string; email?: string; id?: string }) {
    if (!workspaceId) return;
    this.currentWorkspaceId = workspaceId;
    if (user) this.currentUser = user;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'JOIN',
          workspaceId,
          user: this.currentUser,
        })
      );
    } else {
      this.pullHttpSync(workspaceId);
    }
  }

  public joinNote(workspaceId: string, noteId: string, user?: { name?: string; email?: string; id?: string }) {
    if (!noteId) return;
    this.currentActiveNoteId = noteId;
    if (workspaceId) this.currentWorkspaceId = workspaceId;
    if (user) this.currentUser = user;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'NOTE_JOIN',
          workspaceId: this.currentWorkspaceId,
          noteId,
          user: this.currentUser,
        })
      );
    }
  }

  public leaveNote(workspaceId: string, noteId: string) {
    if (this.currentActiveNoteId === noteId) {
      this.currentActiveNoteId = '';
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'NOTE_LEAVE',
          workspaceId: workspaceId || this.currentWorkspaceId,
          noteId,
        })
      );
    }
  }

  /**
   * Broadcasts the user's active editing location and presence on a note block.
   */
  public sendPresenceEditing(
    workspaceId: string,
    noteId: string,
    activeBlockIndex: number,
    activeBlockId?: string,
    isTyping: boolean = true
  ) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'PRESENCE_EDITING',
          workspaceId: workspaceId || this.currentWorkspaceId,
          noteId,
          activeBlockIndex,
          activeBlockId,
          isTyping,
          user: this.currentUser,
        })
      );
    }
  }

  public sendNoteChange(workspaceId: string, note: Note) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'NOTE_CHANGE',
          workspaceId,
          note,
          user: this.currentUser,
        })
      );
    }
  }

  public sendBlocksChange(workspaceId: string, noteId: string, blocks: Block[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'BLOCKS_CHANGE',
          workspaceId,
          noteId,
          blocks,
          user: this.currentUser,
        })
      );
    }
  }

  public requestSync(workspaceId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'REQUEST_SYNC',
          workspaceId,
        })
      );
    } else {
      this.pullHttpSync(workspaceId);
    }
  }

  private async handleIncomingMessage(msg: any) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'SYNC_TICK':
      case 'SYNC_FULL': {
        const { workspaceId, notes, blocks, activeMembers, timestamp } = msg;
        if (!workspaceId || workspaceId !== this.currentWorkspaceId) return;

        let hasNewData = false;

        // Apply shared notes into localDb
        if (Array.isArray(notes) && notes.length > 0) {
          for (const remote of notes) {
            const local = await localDb.notes.get(remote.id);
            if (!local) {
              await localDb.notes.put(remote);
              hasNewData = true;
            } else {
              const localTime = new Date(local.updated_at).getTime();
              const remoteTime = new Date(remote.updated_at).getTime();
              if (remoteTime > localTime) {
                await localDb.notes.put({ ...local, ...remote });
                hasNewData = true;
              }
            }
          }
        }

        // Apply shared blocks into localDb
        if (Array.isArray(blocks) && blocks.length > 0) {
          for (const remoteBlock of blocks) {
            const localBlock = await localDb.blocks.get(remoteBlock.id);
            if (!localBlock) {
              await localDb.blocks.put(remoteBlock);
              hasNewData = true;
            } else {
              const localTime = new Date(localBlock.updated_at).getTime();
              const remoteTime = new Date(remoteBlock.updated_at).getTime();
              if (remoteTime > localTime) {
                await localDb.blocks.put({ ...localBlock, ...remoteBlock });
                hasNewData = true;
              }
            }
          }
        }

        this.lastSyncTime = timestamp || Date.now();

        this.notify({
          type: msg.type,
          workspaceId,
          notes,
          blocks,
          activeMembers,
          timestamp: this.lastSyncTime,
        });

        if (hasNewData) {
          broadcastTabSync({ type: 'NOTES_CHANGED', workspaceId });
        }
        break;
      }

      case 'NOTE_UPDATED': {
        const { workspaceId, note } = msg;
        if (workspaceId && note) {
          await localDb.notes.put(note);
          this.notify({
            type: 'NOTE_UPDATED',
            workspaceId,
            note,
            timestamp: Date.now(),
          });
          broadcastTabSync({ type: 'NOTE_MUTATED', noteId: note.id, workspaceId });
        }
        break;
      }

      case 'BLOCKS_UPDATED': {
        const { workspaceId, noteId, blocks } = msg;
        if (noteId && Array.isArray(blocks)) {
          // 1. Immediately notify note subscribers (BlockEditor) without waiting for Dexie transaction
          this.notify({
            type: 'BLOCKS_UPDATED',
            workspaceId,
            noteId,
            blocks,
            timestamp: Date.now(),
          });

          // 2. Persist to Dexie asynchronously in background
          localDb.transaction('rw', [localDb.blocks], async () => {
            const existing = await localDb.blocks.where('note_id').equals(noteId).toArray();
            if (existing.length > 0) {
              await localDb.blocks.bulkDelete(existing.map((b) => b.id));
            }
            await localDb.blocks.bulkPut(blocks);
          }).catch((err) => console.warn('[RealtimeClient] Dexie bulkPut warning:', err));

          broadcastTabSync({ type: 'NOTE_MUTATED', noteId, workspaceId });
        }
        break;
      }

      case 'COLLISION_ALERT': {
        const { workspaceId, noteId, activeBlockIndex, users, timestamp } = msg;
        this.notify({
          type: 'COLLISION_ALERT',
          workspaceId,
          noteId,
          activeBlockIndex,
          users,
          timestamp: timestamp || Date.now(),
        });
        break;
      }

      case 'COLLISION_CLEAR': {
        const { workspaceId, noteId, activeBlockIndex, timestamp } = msg;
        this.notify({
          type: 'COLLISION_CLEAR',
          workspaceId,
          noteId,
          activeBlockIndex,
          timestamp: timestamp || Date.now(),
        });
        break;
      }

      case 'PRESENCE_UPDATED': {
        const { workspaceId, noteId, activeEditors, timestamp } = msg;
        this.notify({
          type: 'PRESENCE_UPDATED',
          workspaceId,
          noteId,
          activeEditors,
          timestamp: timestamp || Date.now(),
        });
        break;
      }

      case 'MEMBER_JOINED':
      case 'MEMBER_LEFT': {
        this.notify(msg);
        break;
      }

      default:
        break;
    }
  }

  private async pullHttpSync(workspaceId: string) {
    if (!workspaceId) return;
    try {
      const [notesRes, blocksRes] = await Promise.all([
        fetch(`/api/notes?workspaceId=${encodeURIComponent(workspaceId)}`),
        fetch(`/api/blocks?workspaceId=${encodeURIComponent(workspaceId)}`),
      ]);

      if (notesRes.ok) {
        const notesJson = await notesRes.json();
        if (Array.isArray(notesJson.data) && notesJson.data.length > 0) {
          for (const remote of notesJson.data) {
            const local = await localDb.notes.get(remote.id);
            if (!local || new Date(remote.updated_at).getTime() > new Date(local.updated_at).getTime()) {
              await localDb.notes.put(remote);
            }
          }
        }
      }

      if (blocksRes.ok) {
        const blocksJson = await blocksRes.json();
        if (Array.isArray(blocksJson.data) && blocksJson.data.length > 0) {
          for (const remoteBlock of blocksJson.data) {
            const localBlock = await localDb.blocks.get(remoteBlock.id);
            if (!localBlock || new Date(remoteBlock.updated_at).getTime() > new Date(localBlock.updated_at).getTime()) {
              await localDb.blocks.put(remoteBlock);
            }
          }
        }
      }

      this.notify({
        type: 'SYNC_TICK',
        workspaceId,
        timestamp: Date.now(),
      });
    } catch {}
  }
}

export const synapseRealtime = new SynapseRealtimeClient();
