import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { DEFAULT_WORKSPACE_ID } from '@/lib/dexie/seed';
import { Whiteboard, CanvasElement, CanvasConnection } from '@/types/domain';

export function createStarterFigJamWhiteboard(workspaceId: string = DEFAULT_WORKSPACE_ID): Whiteboard {
  const now = new Date().toISOString();
  return {
    id: `wb-figjam-${crypto.randomUUID().slice(0, 8)}`,
    workspace_id: workspaceId,
    title: 'Collaborative Whiteboard & Brainstorm',
    icon: '📋',
    board_type: 'whiteboard',
    viewport: { x: 120, y: 80, zoom: 1.0 },
    elements: [
      {
        id: 'el-fj-frame-1',
        type: 'frame',
        x: 180,
        y: 120,
        width: 820,
        height: 460,
        content: { title: '💡 Sprint Ideation & Brainstorm' },
        z_index: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-sticky-1',
        type: 'sticky',
        x: 220,
        y: 190,
        width: 220,
        height: 180,
        content: {
          text: '🚀 User Experience\n• Super smooth freehand drawing\n• Real-time FigJam stamps & emojis\n• Sticky notes with author tags',
          color: '#fef08a',
          bg_color: '#713f12',
          author: 'Subhadeep',
        },
        z_index: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-sticky-2',
        type: 'sticky',
        x: 480,
        y: 190,
        width: 220,
        height: 180,
        content: {
          text: '🎯 Features Needed\n• FigJam 1-click templates\n• Brainstorming timer widget\n• Shape connectors & quick colors',
          color: '#fbcfe8',
          bg_color: '#500724',
          author: 'Team',
        },
        z_index: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-sticky-3',
        type: 'sticky',
        x: 740,
        y: 190,
        width: 220,
        height: 180,
        content: {
          text: '⚡ Action Items\n• Try the Pen (P) & Highlighter (B)!\n• Drop a reaction stamp with (X)\n• Set a 3-minute brainstorm timer',
          color: '#bae6fd',
          bg_color: '#082f49',
          author: 'Lead',
        },
        z_index: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-stamp-1',
        type: 'stamp',
        x: 400,
        y: 340,
        width: 48,
        height: 48,
        content: {
          emoji: '🔥',
          count: 5,
          author: 'Subhadeep',
        },
        z_index: 20,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-stamp-2',
        type: 'stamp',
        x: 660,
        y: 340,
        width: 48,
        height: 48,
        content: {
          emoji: '👍',
          count: 3,
        },
        z_index: 20,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'el-fj-drawing-1',
        type: 'drawing',
        x: 230,
        y: 400,
        width: 450,
        height: 120,
        content: {
          tool_type: 'pen',
          stroke_color: '#818cf8',
          stroke_width: 3,
          points: [
            { x: 0, y: 40 },
            { x: 40, y: 20 },
            { x: 90, y: 45 },
            { x: 140, y: 25 },
            { x: 200, y: 35 },
            { x: 280, y: 15 },
            { x: 360, y: 30 },
          ],
        },
        z_index: 15,
        created_at: now,
        updated_at: now,
      },
    ],
    connections: [],
    created_at: now,
    updated_at: now,
  };
}

export function createStarterWhiteboard(
  workspaceId: string = DEFAULT_WORKSPACE_ID,
  boardType: 'whiteboard' | 'canvas' = 'canvas'
): Whiteboard {
  if (boardType === 'whiteboard') {
    return createStarterFigJamWhiteboard(workspaceId);
  }
  const now = new Date().toISOString();
  return {
    id: `wb-${crypto.randomUUID().slice(0, 8)}`,
    workspace_id: workspaceId,
    title: 'Synapse Architecture & Mindmap',
    icon: '🎨',
    board_type: 'canvas',
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
        const starterCanvas = createStarterWhiteboard(workspaceId, 'canvas');
        const starterWhiteboard = createStarterWhiteboard(workspaceId, 'whiteboard');
        await localDb.whiteboards.bulkPut([starterCanvas, starterWhiteboard]);
        return [starterCanvas, starterWhiteboard];
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
        wb = createStarterWhiteboard(DEFAULT_WORKSPACE_ID, 'whiteboard');
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
        title: updates.title ?? existing?.title ?? 'Untitled Board',
        icon: updates.icon ?? existing?.icon ?? '📋',
        board_type: updates.board_type ?? existing?.board_type ?? 'whiteboard',
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
      title,
      icon,
      board_type = 'whiteboard',
    }: {
      workspaceId?: string;
      title?: string;
      icon?: string;
      board_type?: 'whiteboard' | 'canvas';
    }) => {
      const now = new Date().toISOString();
      const id = `wb-${crypto.randomUUID().slice(0, 8)}`;
      const defaultTitle = board_type === 'whiteboard' ? 'New Whiteboard' : 'New Spatial Canvas';
      const defaultIcon = board_type === 'whiteboard' ? '📋' : '🎨';

      const starterElements: CanvasElement[] =
        board_type === 'whiteboard'
          ? [
              {
                id: `el-${crypto.randomUUID().slice(0, 8)}`,
                type: 'sticky',
                x: 250,
                y: 180,
                width: 220,
                height: 180,
                content: {
                  text: '💡 Start brainstorming here...\n• Use Pen (P) or Highlighter (B)\n• Add stamps with (X)',
                  color: '#fef08a',
                  bg_color: '#713f12',
                  author: 'You',
                },
                z_index: 1,
                created_at: now,
                updated_at: now,
              },
            ]
          : [
              {
                id: `el-${crypto.randomUUID().slice(0, 8)}`,
                type: 'sticky',
                x: 250,
                y: 180,
                width: 220,
                height: 180,
                content: {
                  text: '💡 Spatial Architecture Node',
                  color: '#a7f3d0',
                  bg_color: '#064e3b',
                },
                z_index: 1,
                created_at: now,
                updated_at: now,
              },
            ];

      const newCanvas: Whiteboard = {
        id,
        workspace_id: workspaceId,
        title: title || defaultTitle,
        icon: icon || defaultIcon,
        board_type,
        viewport: { x: 300, y: 200, zoom: 1.0 },
        elements: starterElements,
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

