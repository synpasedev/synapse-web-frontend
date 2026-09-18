import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { synapseRealtime, RealtimeEvent } from '@/lib/realtime/ws-client';
import { useAuth } from '@/hooks/use-auth';

export function useWorkspaceRealtime(workspaceId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeMembers, setActiveMembers] = useState<number>(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    setIsConnected(synapseRealtime.isConnected);
    if (!workspaceId) return;

    // Join workspace room over WebSocket (like joining a chat room)
    synapseRealtime.joinWorkspace(workspaceId, user ? { name: user.name, email: user.email, id: user.id } : undefined);

    const unsubscribe = synapseRealtime.subscribe((event: RealtimeEvent) => {
      switch (event.type) {
        case 'CONNECTED':
          setIsConnected(true);
          break;

        case 'DISCONNECTED':
          setIsConnected(false);
          break;

        case 'SYNC_TICK':
        case 'SYNC_FULL':
          setLastSyncedAt(new Date(event.timestamp || Date.now()));
          if (event.activeMembers !== undefined) {
            setActiveMembers(event.activeMembers);
          }
          queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          break;

        case 'NOTE_UPDATED':
          setLastSyncedAt(new Date());
          queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] });
          if (event.note?.id) {
            queryClient.invalidateQueries({ queryKey: ['note', event.note.id] });
          }
          break;

        case 'BLOCKS_UPDATED':
          setLastSyncedAt(new Date());
          if (event.noteId) {
            queryClient.invalidateQueries({ queryKey: ['blocks', event.noteId] });
            queryClient.invalidateQueries({ queryKey: ['note', event.noteId] });
          }
          break;

        case 'MEMBER_JOINED':
        case 'MEMBER_LEFT':
          if (event.activeMembers !== undefined) {
            setActiveMembers(event.activeMembers);
          }
          queryClient.invalidateQueries({ queryKey: ['workspace_members', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          break;

        default:
          break;
      }
    });

    // Request initial sync
    synapseRealtime.requestSync(workspaceId);

    return () => {
      unsubscribe();
    };
  }, [workspaceId, user, queryClient]);

  return {
    isConnected,
    activeMembers,
    lastSyncedAt,
    requestSync: () => synapseRealtime.requestSync(workspaceId),
  };
}
