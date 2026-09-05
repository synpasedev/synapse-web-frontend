'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useBacklinks } from '@/hooks/use-links';
import { Link2, ArrowUpRight, Network } from 'lucide-react';

export const BacklinksPanel: React.FC<{ noteId: string }> = ({ noteId }) => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { data: backlinks, isLoading } = useBacklinks(noteId);

  if (isLoading || !backlinks?.length) {
    return (
      <div className="mt-14 pt-6 border-t border-border/40 text-xs text-muted-foreground/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          <span>0 Incoming Backlinks</span>
        </div>
        <Link
          href={`/${workspaceId}/graph`}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <Network className="w-3.5 h-3.5" />
          <span>Open Graph View</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-16 pt-8 border-t border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          <Link2 className="w-4 h-4 text-indigo-400" />
          <span>{backlinks.length} Incoming Backlinks</span>
        </div>
        <Link
          href={`/${workspaceId}/graph`}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          <Network className="w-3.5 h-3.5" />
          <span>View in Interactive Graph</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {backlinks.map((link) => (
          <Link
            key={link.id}
            href={`/${workspaceId}/notes/${link.source_note_id}`}
            className="group flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/40 hover:bg-secondary/60 hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">{link.source_note?.icon || '📄'}</span>
              <span className="text-sm font-medium text-foreground group-hover:text-indigo-400 transition-colors truncate">
                {link.source_note?.title || 'Untitled Note'}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
};
