import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Template } from '@/types/domain';

export function useTemplates(workspaceId: string) {
  return useQuery({
    queryKey: ['templates', workspaceId],
    queryFn: async (): Promise<Template[]> => {
      await ensureSeedData();
      return await localDb.templates.where('workspace_id').equals(workspaceId).toArray();
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<Template, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newTemplate: Template = {
        ...template,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      await localDb.templates.put(newTemplate);
      return newTemplate;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates', newTemplate.workspace_id] });
    },
  });
}
