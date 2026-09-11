import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ensureSeedData } from '@/lib/dexie/seed';
import { getCurrentUserInfo } from '@/hooks/use-auth';
import { Block } from '@/types/domain';

export function useBlocks(noteId: string) {
  return useQuery({
    queryKey: ['blocks', noteId],
    queryFn: async (): Promise<Block[]> => {
      await ensureSeedData();

      // Fetch remote team blocks
      if (noteId) {
        try {
          const res = await fetch(`/api/blocks?noteId=${encodeURIComponent(noteId)}`);
          if (res.ok) {
            const json = await res.json();
            const remoteBlocks: Block[] = json.data || [];
            if (remoteBlocks.length > 0) {
              const localBlocks = await localDb.blocks.where('note_id').equals(noteId).sortBy('sort_order');
              const localMax = Math.max(0, ...localBlocks.map((b) => new Date(b.updated_at || 0).getTime()));
              const remoteMax = Math.max(0, ...remoteBlocks.map((b) => new Date(b.updated_at || 0).getTime()));

              // If remote is newer or local is empty, update local blocks
              if (remoteMax >= localMax || localBlocks.length === 0) {
                await localDb.transaction('rw', [localDb.blocks], async () => {
                  const existing = await localDb.blocks.where('note_id').equals(noteId).toArray();
                  if (existing.length > 0) {
                    await localDb.blocks.bulkDelete(existing.map((b) => b.id));
                  }
                  await localDb.blocks.bulkPut(remoteBlocks);
                });
              }
            }
          }
        } catch (err) {
          // Network fallback
        }
      }

      const blocks = await localDb.blocks
        .where('note_id')
        .equals(noteId)
        .sortBy('sort_order');

      return blocks;
    },
    enabled: Boolean(noteId),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });
}

export function useMutateBlocks(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blocksToSave: Block[]) => {
      if (!blocksToSave) return;

      const user = getCurrentUserInfo();
      const now = new Date().toISOString();
      const enrichedBlocks: Block[] = blocksToSave.map((b) => ({
        ...b,
        created_by: b.created_by || user.name || user.email || 'local-user',
        updated_by: user.name || user.email || 'local-user',
        author_name: user.name,
        author_email: user.email,
        updated_at: now,
      }));

      let toDeleteIds: string[] = [];

      // 1. Transactional Dexie update: replace existing blocks for this note atomically and touch note timestamp
      await localDb.transaction('rw', [localDb.blocks, localDb.sync_queue, localDb.notes], async () => {
        const existing = await localDb.blocks.where('note_id').equals(noteId).toArray();
        const newIds = new Set(enrichedBlocks.map((b) => b.id));
        toDeleteIds = existing.filter((b) => !newIds.has(b.id)).map((b) => b.id);

        if (toDeleteIds.length > 0) {
          await localDb.blocks.bulkDelete(toDeleteIds);
        }

        // Put active blocks
        await localDb.blocks.bulkPut(enrichedBlocks);

        // Update note updated_at timestamp in localDb
        await localDb.notes.update(noteId, { updated_at: now });
      });

      // 2. Dispatch to shared server store
      fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          blocks: enrichedBlocks,
        }),
      }).catch((err) => console.warn('Failed to broadcast blocks:', err));

      // 3. Enqueue DELETE sync mutations for removed blocks
      if (toDeleteIds.length > 0) {
        await syncEngine.enqueueBatch(
          toDeleteIds.map((delId) => ({
            table: 'blocks',
            entityId: delId,
            operation: 'DELETE',
            payload: { id: delId },
            clientMutationId: `mutation-delete-block-${delId}`,
          }))
        );
      }

      // 4. Enqueue UPSERT sync mutations for active blocks
      if (enrichedBlocks.length > 0) {
        await syncEngine.enqueueBatch(
          enrichedBlocks.map((block) => ({
            table: 'blocks',
            entityId: block.id,
            operation: 'UPSERT',
            payload: block,
            clientMutationId: `mutation-block-${block.id}`,
          }))
        );
      }
    },
    onMutate: async (newBlocks) => {
      await queryClient.cancelQueries({ queryKey: ['blocks', noteId] });
      const previousBlocks = queryClient.getQueryData<Block[]>(['blocks', noteId]);
      queryClient.setQueryData<Block[]>(['blocks', noteId], newBlocks);
      return { previousBlocks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', noteId] });
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
    onError: (_err, _newBlocks, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(['blocks', noteId], context.previousBlocks);
      }
    },
  });
}
