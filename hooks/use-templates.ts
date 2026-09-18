import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { ensureSeedData } from '@/lib/dexie/seed';
import { Template } from '@/types/domain';
import { getBuiltinTemplates } from '@/lib/templates/builtin-templates';

export function useTemplates(workspaceId: string) {
  return useQuery({
    queryKey: ['templates', workspaceId],
    queryFn: async (): Promise<Template[]> => {
      await ensureSeedData();
      if (!workspaceId) return [];

      const all = await localDb.templates.toArray();
      const existing = all.filter(
        (t) => t.workspace_id === workspaceId || t.workspace_id === 'builtin'
      );

      if (existing.length > 0) {
        return existing;
      }

      // Seed built-in templates into localDb for this workspace
      const builtins = getBuiltinTemplates(workspaceId);
      await localDb.templates.bulkPut(builtins);
      return builtins;
    },
    enabled: Boolean(workspaceId),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<Template, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newTemplate: Template = {
        ...template,
        id: `tmpl-custom-${crypto.randomUUID().slice(0, 8)}`,
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

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      await localDb.templates.delete(id);
      return { id, workspaceId };
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['templates', workspaceId] });
    },
  });
}
