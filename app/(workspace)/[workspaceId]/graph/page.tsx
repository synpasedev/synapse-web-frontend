'use client';

import React, { use } from 'react';
import { useNotes } from '@/hooks/use-notes';
import { useLinks } from '@/hooks/use-links';
import { GraphView } from '@/components/graph/GraphView';
import { Loader2, Network, Sparkles } from 'lucide-react';

export default function GraphPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const { data: notes, isLoading: isNotesLoading } = useNotes(workspaceId);
  const { data: links, isLoading: isLinksLoading } = useLinks(workspaceId);

  if (isNotesLoading || isLinksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 sm:p-6 pt-16 sm:pt-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Interactive Knowledge Graph</h1>
            <p className="text-xs text-muted-foreground">
              Visualizing connections and bidirectional links across your workspace
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        <GraphView
          workspaceId={workspaceId}
          notes={notes || []}
          links={links || []}
        />
      </div>
    </div>
  );
}
