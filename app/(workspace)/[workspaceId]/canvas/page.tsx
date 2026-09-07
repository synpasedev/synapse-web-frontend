'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWhiteboards, useCreateWhiteboard, useDeleteWhiteboard } from '@/hooks/use-whiteboard';
import {
  Palette,
  Plus,
  Sparkles,
  Clock,
  ArrowRight,
  Trash2,
  Network,
  FileText,
  Shapes,
  Lightbulb,
  HeartHandshake,
  Scale,
  GitMerge,
} from 'lucide-react';

export default function CanvasGalleryPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const { data: whiteboards, isLoading } = useWhiteboards(workspaceId);
  const { mutateAsync: createWhiteboard, isPending: isCreating } = useCreateWhiteboard();
  const { mutate: deleteWhiteboard } = useDeleteWhiteboard();

  const handleCreateNew = async () => {
    const nextNum = (whiteboards?.length || 0) + 1;
    const newBoard = await createWhiteboard({
      workspaceId,
      title: `Whiteboard Canvas #${nextNum}`,
      icon: '🎨',
      board_type: 'canvas',
    });
    router.push(`/${workspaceId}/canvas/${newBoard.id}`);
  };

  const handleDelete = (wbId: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${title}"?`)) {
      deleteWhiteboard(wbId);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-10 text-foreground">
      {/* Soothing Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 mb-9 border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-background/50 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold mb-3.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Whiteboard &amp; Spatial Canvas Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-2.5">
            Whiteboard &amp; <span className="text-pink-300">Spatial Canvases</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
            An infinite, collaborative visual workspace with FigJam-style freehand drawing, highlighters, emoji stamps, pastel sticky notes, mindmaps, and bidirectional Synapse note cards connected in 2D space.
          </p>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Whiteboard Canvas</span>
            </button>

            <Link
              href={`/${workspaceId}/notes`}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-medium border border-border/50 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>All Notes</span>
            </Link>

            <Link
              href={`/${workspaceId}/graph`}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-medium border border-border/50 transition-colors cursor-pointer"
            >
              <Network className="w-4 h-4 text-muted-foreground" />
              <span>Knowledge Graph</span>
            </Link>
          </div>
        </div>

        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Start Templates Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Quick Start Templates</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: '💡 Ideation & Brainstorm',
              desc: '3-column stickies with votes',
              icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
            },
            {
              title: '❤️ Mad / Sad / Glad Retro',
              desc: 'Sprint reflection & actions',
              icon: <HeartHandshake className="w-4 h-4 text-rose-400" />,
            },
            {
              title: '⚖️ Pros & Cons',
              desc: 'Trade-off decision matrix',
              icon: <Scale className="w-4 h-4 text-indigo-400" />,
            },
            {
              title: '🔄 Flowchart & Logic',
              desc: 'Shapes with connected arrows',
              icon: <GitMerge className="w-4 h-4 text-emerald-400" />,
            },
          ].map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={handleCreateNew}
              className="p-3.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 hover:border-pink-500/40 text-left transition-all cursor-pointer group"
            >
              <div className="p-2 rounded-xl bg-background/80 w-fit mb-2 group-hover:scale-110 transition-transform">
                {t.icon}
              </div>
              <h3 className="text-xs font-bold text-foreground mb-0.5 group-hover:text-pink-300 transition-colors">
                {t.title}
              </h3>
              <p className="text-[11px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* All Boards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span>All Canvases &amp; Whiteboards ({whiteboards?.length || 0})</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-card/40 animate-pulse border border-border/30" />
            ))}
          </div>
        ) : !whiteboards?.length ? (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-3xl bg-card/20">
            <Shapes className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No canvases created yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Get started by creating your first infinite whiteboard canvas.
            </p>
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Whiteboard Canvas</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {whiteboards.map((wb) => {
              const elementCount = wb.elements?.length || 0;
              const hasDrawing = wb.elements?.some((el) => el.type === 'drawing');
              const stampsCount = wb.elements?.filter((el) => el.type === 'stamp').length || 0;

              return (
                <Link
                  key={wb.id}
                  href={`/${workspaceId}/canvas/${wb.id}`}
                  className="group p-4 rounded-2xl border border-border/60 bg-card/60 hover:bg-secondary/50 hover:border-pink-500/40 transition-all flex flex-col justify-between shadow-xs min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{wb.icon || '🎨'}</span>
                        <div className="font-bold text-xs text-foreground group-hover:text-pink-300 transition-colors truncate">
                          {wb.title || 'Untitled Board'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(wb.id, wb.title, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete canvas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border/40 text-[10px] text-muted-foreground font-mono">
                        {elementCount} {elementCount === 1 ? 'item' : 'items'}
                      </span>
                      {hasDrawing && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-medium border border-indigo-500/20">
                          ✏️ Drawings
                        </span>
                      )}
                      {stampsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-pink-500/10 text-pink-300 text-[10px] font-medium border border-pink-500/20">
                          {stampsCount} stamps
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 mt-3 border-t border-border/30">
                    <span className="flex items-center gap-1 text-[11px]" suppressHydrationWarning>
                      <Clock className="w-3 h-3" />
                      {new Date(wb.updated_at || wb.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-pink-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
