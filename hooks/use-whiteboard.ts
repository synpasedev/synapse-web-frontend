import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';
import { Whiteboard, CanvasElement, CanvasConnection } from '@/types/domain';

export function createStarterWhiteboard(workspaceId: string = DEFAULT_WORKSPACE_ID): Whiteboard {
  const now = new Date().toISOString();
  return {
    id: `wb-${crypto.randomUUID().slice(0, 8)}`,
    workspace_id: workspaceId,
    title: 'Synapse Architecture & Mindmap',
    icon: '🎨',
    viewport: { x: 180, y: 120, zoom: 1.0 },
    elements: [
      {
        id: 'el-mindmap-root',
        type: 'mindmap_node',
        x: 420,
        y: 200,
        width: 220,
        height: 56,
        content: {
          text: '🧠 Synapse Work OS',
          color: '#818cf8',
          bg_color: '#312e81',
          font_size: 16,
        },
        parent_id: null,
        z_index: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-mindmap-child-1',
        type: 'mindmap_node',
        x: 740,
        y: 130,
        width: 200,
        height: 48,
        content: {
          text: '⚡ Local-First Engine',
          color: '#34d399',
          bg_color: '#064e3b',
          font_size: 14,
        },
        parent_id: 'el-mindmap-root',
        z_index: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-mindmap-child-2',
        type: 'mindmap_node',
        x: 740,
        y: 270,
        width: 200,
        height: 48,
        content: {
          text: '🌐 Knowledge Graph',
          color: '#c084fc',
          bg_color: '#581c87',
          font_size: 14,
        },
        parent_id: 'el-mindmap-root',
        z_index: 10,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-sticky-1',
        type: 'sticky',
        x: 120,
        y: 110,
        width: 210,
        height: 170,
        content: {
          text: '💡 Spatial Principles:\n• 60fps pan/zoom\n• Bidirectional notes\n• Smart connector arrows',
          color: '#fef08a',
          bg_color: '#713f12',
        },
        z_index: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-sticky-2',
        type: 'sticky',
        x: 120,
        y: 310,
        width: 210,
        height: 150,
        content: {
          text: '🎯 Shortcuts:\n• S: Sticky Note\n• N: Note Card\n• M: Mindmap Node',
          color: '#a7f3d0',
          bg_color: '#064e3b',
        },
        z_index: 5,
        created_at: now,
        updated_at: now,
      },
    ],
    connections: [
      {
        id: 'conn-1',
        from_element_id: 'el-mindmap-root',
        to_element_id: 'el-mindmap-child-1',
        from_anchor: 'right',
        to_anchor: 'left',
        style: 'curved',
        color: '#6366f1',
      },
      {
        id: 'conn-2',
        from_element_id: 'el-mindmap-root',
        to_element_id: 'el-mindmap-child-2',
        from_anchor: 'right',
        to_anchor: 'left',
        style: 'curved',
        color: '#a855f7',
      },
      {
        id: 'conn-3',
        from_element_id: 'el-sticky-1',
        to_element_id: 'el-mindmap-root',
        from_anchor: 'right',
        to_anchor: 'left',
        style: 'curved',
        color: '#eab308',
      },
    ],
    created_at: now,
    updated_at: now,
  };
}

export function useWhiteboards(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  return useQuery({
    queryKey: ['whiteboards', workspaceId],
    queryFn: async (): Promise<Whiteboard[]> => {
      let list = await localDb.whiteboards
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();

      if (!list.length) {
        list = await localDb.whiteboards.toArray();
      }

      // Auto-seed starter whiteboard if completely empty
      if (!list.length) {
        const starter = createStarterWhiteboard(workspaceId);
        await localDb.whiteboards.put(starter);
        return [starter];
      }

      return list;
    },
  });
}

export function useWhiteboard(whiteboardId: string) {
  return useQuery({
    queryKey: ['whiteboard', whiteboardId],
    queryFn: async (): Promise<Whiteboard | null> => {
      let wb = await localDb.whiteboards.get(whiteboardId);

      if (!wb) {
        const all = await localDb.whiteboards.toArray();
        wb = all[0] || null;
      }

      if (!wb) {
        wb = createStarterWhiteboard(DEFAULT_WORKSPACE_ID);
        await localDb.whiteboards.put(wb);
      }

      // Check synchronous draft buffer
      if (wb && typeof window !== 'undefined') {
        try {
          const draftRaw = localStorage.getItem(`synapse_canvas_draft_${wb.id}`);
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (draft && Array.isArray(draft.elements)) {
              return {
                ...wb,
                elements: draft.elements,
                connections: draft.connections || wb.connections,
                viewport: draft.viewport || wb.viewport,
              };
            }
          }
        } catch (e) {}
      }

      return wb;
    },
    enabled: Boolean(whiteboardId),
  });
}

export function useMutateWhiteboard(whiteboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Whiteboard>) => {
      if (!whiteboardId) return;

      const now = new Date().toISOString();
      const existing = await localDb.whiteboards.get(whiteboardId);

      const merged: Whiteboard = {
        id: whiteboardId,
        workspace_id: existing?.workspace_id || DEFAULT_WORKSPACE_ID,
        title: updates.title ?? existing?.title ?? 'Untitled Canvas',
        icon: updates.icon ?? existing?.icon ?? '🎨',
        viewport: updates.viewport ?? existing?.viewport ?? { x: 0, y: 0, zoom: 1 },
        elements: updates.elements ?? existing?.elements ?? [],
        connections: updates.connections ?? existing?.connections ?? [],
        created_at: existing?.created_at || now,
        updated_at: now,
      };

      // Synchronous local draft buffer
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `synapse_canvas_draft_${whiteboardId}`,
            JSON.stringify({
              elements: merged.elements,
              connections: merged.connections,
              viewport: merged.viewport,
            })
          );
        } catch (e) {}
      }

      await localDb.whiteboards.put(merged);

      await syncEngine.enqueue({
        table: 'whiteboards' as any,
        entityId: whiteboardId,
        operation: 'UPSERT',
        payload: merged,
        clientMutationId: `mutation-canvas-${whiteboardId}`,
      });

      return merged;
    },
    onMutate: async (newUpdates) => {
      await queryClient.cancelQueries({ queryKey: ['whiteboard', whiteboardId] });
      const previous = queryClient.getQueryData<Whiteboard>(['whiteboard', whiteboardId]);

      if (previous) {
        queryClient.setQueryData<Whiteboard>(['whiteboard', whiteboardId], {
          ...previous,
          ...newUpdates,
        });
      }

      return { previous };
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['whiteboard', updated.id] });
        queryClient.invalidateQueries({ queryKey: ['whiteboards'] });
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['whiteboard', whiteboardId], context.previous);
      }
    },
  });
}

export function useCreateWhiteboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId = DEFAULT_WORKSPACE_ID,
      title = 'New Brainstorm Canvas',
      icon = '🎨',
    }: {
      workspaceId?: string;
      title?: string;
      icon?: string;
    }) => {
      const now = new Date().toISOString();
      const id = `wb-${crypto.randomUUID().slice(0, 8)}`;

      const newCanvas: Whiteboard = {
        id,
        workspace_id: workspaceId,
        title,
        icon,
        viewport: { x: 300, y: 200, zoom: 1.0 },
        elements: [
          {
            id: `el-${crypto.randomUUID().slice(0, 8)}`,
            type: 'sticky',
            x: 250,
            y: 180,
            width: 220,
            height: 180,
            content: {
              text: '💡 Start brainstorming ideas here...',
              color: '#fef08a',
              bg_color: '#713f12',
            },
            z_index: 1,
            created_at: now,
            updated_at: now,
          },
        ],
        connections: [],
        created_at: now,
        updated_at: now,
      };

      await localDb.whiteboards.put(newCanvas);
      return newCanvas;
    },
    onSuccess: (newWb) => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards', newWb.workspace_id] });
    },
  });
}

export function useDeleteWhiteboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (whiteboardId: string) => {
      await localDb.whiteboards.delete(whiteboardId);

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`synapse_canvas_draft_${whiteboardId}`);
        } catch (e) {}
      }

      await syncEngine.enqueue({
        table: 'whiteboards' as any,
        entityId: whiteboardId,
        operation: 'DELETE',
        payload: { id: whiteboardId },
        clientMutationId: `delete-canvas-${whiteboardId}`,
      });

      return whiteboardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards'] });
    },
  });
}

