import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ensureSeedData } from '@/lib/dexie/seed';
import { getCurrentUserInfo } from '@/hooks/use-auth';
import { Note } from '@/types/domain';

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
            for (const remote of remoteNotes) {
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
    refetchInterval: 4000,
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
    refetchInterval: 3000,
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

      const newNote: Note = {
        id: crypto.randomUUID(),
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

      await localDb.notes.put(newNote);

      // Dispatch to shared server store
      fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      }).catch((err) => console.warn('Failed to broadcast new note:', err));

      await syncEngine.enqueue({
        table: 'notes',
        operation: 'UPSERT',
        entityId: newNote.id,
        payload: newNote,
      });

      return newNote;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes', newNote.workspace_id] });
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

      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['notes', updated.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['note', updated.id] });
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
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] });
    },
  });
}
