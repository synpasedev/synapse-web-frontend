'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tabSync } from '@/lib/dexie/tab-sync';

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  useEffect(() => {
    const unsubscribe = tabSync.subscribe((msg) => {
      if (msg.type === 'BLOCKS_MUTATED') {
        queryClient.invalidateQueries({ queryKey: ['blocks', msg.noteId] });
      } else if (msg.type === 'NOTE_MUTATED') {
        queryClient.invalidateQueries({ queryKey: ['note', msg.noteId] });
        queryClient.invalidateQueries({ queryKey: ['notes', msg.workspaceId] });
      } else if (msg.type === 'NOTES_CHANGED') {
        queryClient.invalidateQueries({ queryKey: ['notes', msg.workspaceId] });
      } else if (msg.type === 'WORKSPACE_MUTATED') {
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        if (msg.workspaceId) {
          queryClient.invalidateQueries({ queryKey: ['workspace', msg.workspaceId] });
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
