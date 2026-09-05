import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Block } from '@/types/domain';

export function useBlocks(noteId: string) {
  return useQuery({
    queryKey: ['blocks', noteId],
    queryFn: async (): Promise<Block[]> => {
      await ensureSeedData();
      const blocks = await localDb.blocks
        .where('note_id')
        .equals(noteId)
        .sortBy('sort_order');

      return blocks;
    },
    enabled: Boolean(noteId),
  });
}

export function useMutateBlocks(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blocksToSave: Block[]) => {
      if (!blocksToSave) return;

      let toDeleteIds: string[] = [];
      const now = new Date().toISOString();

      // 1. Transactional Dexie update: replace existing blocks for this note atomically and touch note timestamp
      await localDb.transaction('rw', [localDb.blocks, localDb.sync_queue, localDb.notes], async () => {
        const existing = await localDb.blocks.where('note_id').equals(noteId).toArray();
        const newIds = new Set(blocksToSave.map((b) => b.id));
        toDeleteIds = existing.filter((b) => !newIds.has(b.id)).map((b) => b.id);

        if (toDeleteIds.length > 0) {
          await localDb.blocks.bulkDelete(toDeleteIds);
        }

        // Put active blocks
        await localDb.blocks.bulkPut(blocksToSave);

        // Update note updated_at timestamp in localDb
        await localDb.notes.update(noteId, { updated_at: now });
      });

      // 2. Enqueue DELETE sync mutations for removed blocks
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

      // 3. Enqueue UPSERT sync mutations for active blocks
      if (blocksToSave.length > 0) {
        await syncEngine.enqueueBatch(
          blocksToSave.map((block) => ({
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
