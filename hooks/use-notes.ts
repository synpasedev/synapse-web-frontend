import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Note } from '@/types/domain';

export function useNotes(workspaceId: string) {
  return useQuery({
    queryKey: ['notes', workspaceId],
    queryFn: async (): Promise<Note[]> => {
      await ensureSeedData();
      const notes = await localDb.notes
        .where('workspace_id')
        .equals(workspaceId)
        .and((n) => !n.is_archived)
        .sortBy('updated_at');

      return notes.reverse();
    },
  });
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: async (): Promise<Note | null> => {
      await ensureSeedData();
      const note = await localDb.notes.get(noteId);
      return note || null;
    },
    enabled: Boolean(noteId),
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
        created_by: 'local-user',
        updated_by: 'local-user',
        created_at: now,
        updated_at: now,
        version: 1,
      };

      await localDb.notes.put(newNote);
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

      const updated: Note = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
        version: (existing.version || 1) + 1,
      };

      await localDb.notes.put(updated);
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
