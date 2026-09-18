import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ensureSeedData } from '@/lib/dexie/seed';
import { getCurrentUserInfo } from '@/hooks/use-auth';
import { Note, Block } from '@/types/domain';
import { broadcastTabSync } from '@/lib/dexie/tab-sync';
import { synapseRealtime } from '@/lib/realtime/ws-client';

export function useNotes(workspaceId: string) {
  return useQuery({
    queryKey: ['notes', workspaceId],
    queryFn: async (): Promise<Note[]> => {
      await ensureSeedData();

      // Fetch remote team notes from server/Supabase
      if (workspaceId) {
        try {
          const res = await fetch(`/api/notes?workspaceId=${encodeURIComponent(workspaceId)}`);
          if (res.ok) {
            const json = await res.json();
            const remoteNotes: Note[] = json.data || [];
            const remoteMap = new Map<string, Note>();

            for (const remote of remoteNotes) {
              remoteMap.set(remote.id, remote);
              const local = await localDb.notes.get(remote.id);
              if (!local) {
                await localDb.notes.put(remote);
              } else {
                const localTime = new Date(local.updated_at).getTime();
                const remoteTime = new Date(remote.updated_at).getTime();
                if (remoteTime > localTime) {
                  await localDb.notes.put({ ...local, ...remote });
                }
              }
            }

            // BIDIRECTIONAL SYNC:
            // Ensure local notes that are not on the server (or fresher locally) are pushed to the server!
            const localNotes = await localDb.notes
              .where('workspace_id')
              .equals(workspaceId)
              .and((n) => !n.is_archived)
              .toArray();

            const notesToPush = localNotes.filter((local) => {
              const remote = remoteMap.get(local.id);
              if (!remote) return true;
              return new Date(local.updated_at).getTime() > new Date(remote.updated_at).getTime();
            });

            if (notesToPush.length > 0) {
              fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notesToPush, workspaceId }),
              }).catch((err) => console.warn('[useNotes] Notes sync warning:', err));

              const noteIdsToPush = notesToPush.map((n) => n.id);
              localDb.blocks
                .where('note_id')
                .anyOf(noteIdsToPush)
                .toArray()
                .then((blocksToPush) => {
                  if (blocksToPush.length > 0) {
                    fetch('/api/blocks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workspaceId, blocks: blocksToPush }),
                    }).catch((err) => console.warn('[useNotes] Blocks sync warning:', err));
                  }
                })
                .catch(() => {});
            }
          }
        } catch (err) {
          // Fall back to local Dexie on network error
        }
      }

      const notes = await localDb.notes
        .where('workspace_id')
        .equals(workspaceId)
        .and((n) => !n.is_archived)
        .sortBy('updated_at');

      return notes.reverse();
    },
    refetchOnWindowFocus: true,
  });
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: async (): Promise<Note | null> => {
      await ensureSeedData();

      if (noteId) {
        try {
          const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.data) {
              const remote: Note = json.data;
              const local = await localDb.notes.get(noteId);
              if (!local || new Date(remote.updated_at).getTime() > new Date(local.updated_at).getTime()) {
                await localDb.notes.put({ ...(local || {}), ...remote });
              }
              if (Array.isArray((remote as any).blocks) && (remote as any).blocks.length > 0) {
                const localBlockCount = await localDb.blocks.where('note_id').equals(noteId).count();
                if (localBlockCount === 0) {
                  await localDb.blocks.bulkPut((remote as any).blocks);
                }
              }
            }
          }
        } catch (err) {
          // Fallback to local
        }
      }

      const note = await localDb.notes.get(noteId);
      return note || null;
    },
    enabled: Boolean(noteId),
    refetchOnWindowFocus: true,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      title = 'Untitled Note',
      icon = '📄',
      parentId = null,
    }: {
      workspaceId: string;
      title?: string;
      icon?: string;
      parentId?: string | null;
    }) => {
      const now = new Date().toISOString();
      const user = getCurrentUserInfo();
      const authorIdentifier = user.name || user.email || 'local-user';

      const newNoteId = crypto.randomUUID();
      const newNote: Note = {
        id: newNoteId,
        workspace_id: workspaceId,
        parent_id: parentId,
        title,
        icon,
        cover_url: null,
        is_favorite: false,
        is_archived: false,
        is_public: false,
        created_by: authorIdentifier,
        updated_by: authorIdentifier,
        author_name: user.name,
        author_email: user.email,
        created_at: now,
        updated_at: now,
        version: 1,
      };

      const initialBlock: Block = {
        id: crypto.randomUUID(),
        note_id: newNoteId,
        workspace_id: workspaceId,
        type: 'paragraph',
        content: { text: '' },
        properties: {},
        sort_order: 1000,
        created_by: authorIdentifier,
        updated_by: authorIdentifier,
        author_name: user.name,
        author_email: user.email,
        created_at: now,
        updated_at: now,
        parent_block_id: null,
        version: 1,
      };

      await localDb.transaction('rw', [localDb.notes, localDb.blocks], async () => {
        await localDb.notes.put(newNote);
        await localDb.blocks.put(initialBlock);
      });

      // Dispatch to shared server store
      fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      }).catch((err) => console.warn('Failed to broadcast new note:', err));

      fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: newNoteId,
          workspaceId,
          blocks: [initialBlock],
        }),
      }).catch((err) => console.warn('Failed to broadcast new note blocks:', err));

      await syncEngine.enqueue({
        table: 'notes',
        operation: 'UPSERT',
        entityId: newNote.id,
        payload: newNote,
      });

      // Instantly broadcast new note and starter blocks over WebSocket
      synapseRealtime.sendNoteChange(newNote.workspace_id, newNote);
      synapseRealtime.sendBlocksChange(workspaceId, newNoteId, [initialBlock]);

      return newNote;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes', newNote.workspace_id] });
      broadcastTabSync({ type: 'NOTES_CHANGED', workspaceId: newNote.workspace_id });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Note>;
    }) => {
      const existing = await localDb.notes.get(id);
      if (!existing) throw new Error('Note not found');

      const user = getCurrentUserInfo();
      const updated: Note = {
        ...existing,
        ...updates,
        updated_by: user.name || user.email || existing.updated_by,
        author_name: user.name || existing.author_name,
        author_email: user.email || existing.author_email,
        updated_at: new Date().toISOString(),
        version: (existing.version || 1) + 1,
      };

      await localDb.notes.put(updated);

      // Dispatch to shared server store
      fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch((err) => console.warn('Failed to broadcast note update:', err));

      await syncEngine.enqueue({
        table: 'notes',
        operation: 'UPSERT',
        entityId: id,
        payload: updated,
      });

      // Instantly broadcast note update over WebSocket (chat-style)
      synapseRealtime.sendNoteChange(updated.workspace_id, updated);

      return updated;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['note', id] });
      const previousNote = queryClient.getQueryData<Note>(['note', id]);
      if (previousNote) {
        queryClient.setQueryData<Note>(['note', id], { ...previousNote, ...updates });
      }
      return { previousNote };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['note', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['notes', updated.workspace_id] });
      broadcastTabSync({ type: 'NOTE_MUTATED', noteId: updated.id, workspaceId: updated.workspace_id });
    },
    onError: (_err, { id }, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(['note', id], context.previousNote);
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, workspaceId }: { noteId: string; workspaceId: string }) => {
      await localDb.notes.update(noteId, { is_archived: true, updated_at: new Date().toISOString() });

      // Dispatch to shared server store
      fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Failed to broadcast note deletion:', err));

      await syncEngine.enqueue({
        table: 'notes',
        operation: 'UPSERT',
        entityId: noteId,
        payload: { id: noteId, is_archived: true },
      });
      return { noteId, workspaceId };
    },
    onSuccess: ({ workspaceId, noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] });
      broadcastTabSync({ type: 'NOTE_MUTATED', noteId, workspaceId });
    },
  });
}
