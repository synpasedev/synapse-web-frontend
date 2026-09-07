'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWhiteboards, useWhiteboard, useCreateWhiteboard } from '@/hooks/use-whiteboard';
import { WhiteboardCanvas } from '@/components/canvas/WhiteboardCanvas';
import { FigJamTimer } from '@/components/canvas/FigJamTimer';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';

export default function IndividualWhiteboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; whiteboardId: string }>;
}) {
  const { workspaceId, whiteboardId } = use(params);
  const router = useRouter();
  const { data: whiteboard, isLoading } = useWhiteboard(whiteboardId);
  const { data: allBoards } = useWhiteboards(workspaceId);
  const { mutateAsync: createWhiteboard, isPending: isCreating } = useCreateWhiteboard();

  // Filter whiteboards
  const whiteboards = allBoards?.filter((b) => b.board_type === 'whiteboard') || [];

  const handleCreateNewBoard = async () => {
    const nextNum = whiteboards.length + 1;
    const newBoard = await createWhiteboard({
      workspaceId,
      title: `Whiteboard #${nextNum}`,
      icon: '📋',
      board_type: 'whiteboard',
    });
    router.push(`/${workspaceId}/whiteboards/${newBoard.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[70vh]">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col relative bg-[#0e0f14]">
      {/* FigJam Top Header Bar */}
      <div className="h-12 px-4 border-b border-border/40 bg-[#15161c]/90 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to Whiteboard List */}
          <Link
            href={`/${workspaceId}/whiteboards`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Back to All Whiteboards"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Whiteboards</span>
          </Link>

          <div className="h-4 w-px bg-border/40" />

          <div className="flex items-center gap-2">
            <span className="text-lg">{whiteboard?.icon || '📋'}</span>
            <span className="text-xs font-bold text-foreground tracking-tight max-w-[180px] sm:max-w-xs truncate">
              {whiteboard?.title || 'FigJam Whiteboard'}
            </span>
          </div>

          {/* Quick Switcher Tabs */}
          {whiteboards.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border/30">
              {whiteboards.map((b) => (
                <Link
                  key={b.id}
                  href={`/${workspaceId}/whiteboards/${b.id}`}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    whiteboardId === b.id
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Header: Timer & New Whiteboard */}
        <div className="flex items-center gap-2">
          <FigJamTimer />

          <button
            type="button"
            onClick={handleCreateNewBoard}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Whiteboard</span>
          </button>
        </div>
      </div>

      {/* Main FigJam Canvas Viewport */}
      {whiteboard ? (
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <WhiteboardCanvas
            key={whiteboard.id}
            whiteboard={whiteboard}
            workspaceId={workspaceId}
            mode="whiteboard"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Whiteboard not found.</p>
        </div>
      )}
    </div>
  );
}
