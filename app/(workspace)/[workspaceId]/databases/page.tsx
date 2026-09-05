'use client';

import React, { useState, use } from 'react';
import { useDatabases } from '@/hooks/use-databases';
import { TableView } from '@/components/database/TableView';
import { BoardView } from '@/components/database/BoardView';
import { GoogleSheetSyncBadge } from '@/components/sync/GoogleSheetSyncBadge';
import { Database as DbIcon, Table, Kanban, Sparkles, Loader2 } from 'lucide-react';

export default function DatabasesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const { data: databases, isLoading, refetch } = useDatabases(workspaceId);
  const [activeView, setActiveView] = useState<'table' | 'board'>('table');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const defaultDb = databases?.[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-sm">
            {defaultDb?.icon || '🎯'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {defaultDb?.title || 'Sprint Roadmap & Tasks'}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                v0.2 Relational
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Structured database objects with multi-view projection (Table &amp; Kanban)
            </p>
          </div>
        </div>

        {/* Controls: Google Sheet Sync + View Switcher */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {defaultDb && (
            <GoogleSheetSyncBadge
              database={defaultDb}
              workspaceId={workspaceId}
              onRefreshDatabase={() => refetch()}
            />
          )}

          {/* View Switcher Toggle */}
          <div className="flex items-center bg-secondary/80 p-1 rounded-xl border border-border/80 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'table'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-indigo-400" />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'board'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-purple-400" />
              <span>Kanban Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {defaultDb && (
        <div>
          {activeView === 'table' ? (
            <TableView database={defaultDb} />
          ) : (
            <BoardView database={defaultDb} />
          )}
        </div>
      )}
    </div>
  );
}
