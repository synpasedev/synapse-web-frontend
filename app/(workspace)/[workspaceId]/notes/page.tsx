'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotes, useCreateNote } from '@/hooks/use-notes';
import { useUIStore } from '@/stores/use-ui-store';
import {
  FileText,
  Plus,
  Sparkles,
  LayoutTemplate,
  Star,
  Clock,
  ArrowRight,
  Network,
} from 'lucide-react';

export default function NotesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const { data: notes, isLoading } = useNotes(workspaceId);
  const { mutateAsync: createNote } = useCreateNote();
  const { setTemplateModalOpen } = useUIStore();

    const handleCreateNew = async () => {
    const existingUntitled = (notes || []).filter(
      (n) => n.title && (n.title === 'Untitled Note' || /^Untitled Note \d+$/.test(n.title))
    );
    const nextNum = existingUntitled.length + 1;
    const title = existingUntitled.length === 0 ? 'Untitled Note' : `Untitled Note ${nextNum}`;

    const note = await createNote({
      workspaceId,
      title,
      icon: '📄',
    });
    router.push(`/${workspaceId}/notes/${note.id}`);
  };

  const favoriteNotes = notes?.filter((n) => n.is_favorite) || [];

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-10 text-foreground">
      {/* Soothing Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-7 mb-9 border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-background/50 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Calm Knowledge Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2.5">
            Welcome to <span className="text-indigo-300">Synapse</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
            An easing, distraction-free space for your notes, thoughts, and connections. Type <code className="text-indigo-300 bg-secondary/80 px-1.5 py-0.5 rounded text-xs font-mono">/</code> for blocks and <code className="text-indigo-300 bg-secondary/80 px-1.5 py-0.5 rounded text-xs font-mono">[[</code> to link ideas.
          </p>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-medium border border-border/50 transition-colors cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
              <span>Templates</span>
            </button>

            <Link
              href={`/${workspaceId}/graph`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-medium border border-border/50 transition-colors cursor-pointer"
            >
              <Network className="w-4 h-4 text-muted-foreground" />
              <span>Graph View</span>
            </Link>
          </div>
        </div>

        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Favorites Section */}
      {favoriteNotes.length > 0 && (
        <div className="mb-9">
          <div className="flex items-center gap-2 mb-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 text-amber-400/80 fill-amber-400/80" />
            <span>Pinned Notes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {favoriteNotes.map((note) => (
              <Link
                key={note.id}
                href={`/${workspaceId}/notes/${note.id}`}
                className="group p-4 rounded-xl border border-border/60 bg-card/60 hover:bg-secondary/50 hover:border-border transition-all flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-xl">{note.icon || '📄'}</span>
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {note.title}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/30">
                  <span className="flex items-center gap-1 text-[11px]" suppressHydrationWarning>
                    <Clock className="w-3 h-3" />
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Notes Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Notes ({notes?.length || 0})</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-card/40 animate-pulse border border-border/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {notes?.map((note) => (
              <Link
                key={note.id}
                href={`/${workspaceId}/notes/${note.id}`}
                className="group p-4 rounded-xl border border-border/60 bg-card/60 hover:bg-secondary/50 hover:border-border transition-all flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-xl">{note.icon || '📄'}</span>
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {note.title}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/30">
                  <span className="flex items-center gap-1 text-[11px]" suppressHydrationWarning>
                    <Clock className="w-3 h-3" />
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
