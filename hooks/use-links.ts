import { useQuery } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Link } from '@/types/domain';

export function useLinks(workspaceId: string) {
  return useQuery({
    queryKey: ['links', workspaceId],
    queryFn: async (): Promise<Link[]> => {
      await ensureSeedData();
      return await localDb.links.where('workspace_id').equals(workspaceId).toArray();
    },
  });
}

export function useBacklinks(noteId: string) {
  return useQuery({
    queryKey: ['backlinks', noteId],
    queryFn: async (): Promise<Link[]> => {
      await ensureSeedData();
      const incomingLinks = await localDb.links
        .where('target_note_id')
        .equals(noteId)
        .toArray();

      // Hydrate with source note metadata
      const enriched: Link[] = [];
      for (const link of incomingLinks) {
        const sourceNote = await localDb.notes.get(link.source_note_id);
        if (sourceNote && !sourceNote.is_archived) {
          enriched.push({
            ...link,
            source_note: {
              id: sourceNote.id,
              title: sourceNote.title,
              icon: sourceNote.icon,
            },
          });
        }
      }

      return enriched;
    },
    enabled: Boolean(noteId),
  });
}
