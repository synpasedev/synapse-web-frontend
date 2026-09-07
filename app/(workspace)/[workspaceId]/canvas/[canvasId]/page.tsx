'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWhiteboards, useWhiteboard, useCreateWhiteboard } from '@/hooks/use-whiteboard';
import { WhiteboardCanvas } from '@/components/canvas/WhiteboardCanvas';
import { FigJamTimer } from '@/components/canvas/FigJamTimer';
import { Loader2, Plus, ArrowLeft, LayoutGrid } from 'lucide-react';

export default function IndividualCanvasPage({
  params,
}: {
  params: Promise<{ workspaceId: string; canvasId: string }>;
}) {
  const { workspaceId, canvasId } = use(params);
  const router = useRouter();
  const { data: whiteboard, isLoading } = useWhiteboard(canvasId);
  const { data: allBoards } = useWhiteboards(workspaceId);
  const { mutateAsync: createWhiteboard, isPending: isCreating } = useCreateWhiteboard();

  const handleCreateNewBoard = async () => {
    const nextNum = (allBoards?.length || 0) + 1;
    const newBoard = await createWhiteboard({
      workspaceId,
      title: `Whiteboard Canvas #${nextNum}`,
      icon: '🎨',
      board_type: 'canvas',
    });
    router.push(`/${workspaceId}/canvas/${newBoard.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[70vh]">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col relative bg-background text-foreground">
      {/* Top Header Bar */}
      <div className="h-12 px-4 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to Canvas List */}
          <Link
            href={`/${workspaceId}/canvas`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Back to All Canvases"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Canvases</span>
          </Link>

          <div className="h-4 w-px bg-sidebar-border" />

          <div className="flex items-center gap-2">
            <span className="text-lg">{whiteboard?.icon || '🎨'}</span>
            <span className="text-sm font-bold text-heading tracking-tight max-w-[180px] sm:max-w-xs truncate">
              {whiteboard?.title || 'Whiteboard Canvas'}
            </span>
          </div>

          {/* Quick Switcher Tabs */}
          {allBoards && allBoards.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border/30">
              {allBoards.map((b) => (
                <Link
                  key={b.id}
                  href={`/${workspaceId}/canvas/${b.id}`}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    canvasId === b.id
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FigJamTimer />

          <button
            type="button"
            onClick={handleCreateNewBoard}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Canvas</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {whiteboard ? (
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <WhiteboardCanvas
            key={whiteboard.id}
            whiteboard={whiteboard}
            workspaceId={workspaceId}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="p-4 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <LayoutGrid className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Canvas Not Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              This canvas board does not exist or may have been deleted.
            </p>
          </div>
          <Link
            href={`/${workspaceId}/canvas`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Canvases</span>
          </Link>
        </div>
      )}
    </div>
  );
}
