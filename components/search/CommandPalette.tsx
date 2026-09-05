'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/use-ui-store';
import { useNotes, useCreateNote } from '@/hooks/use-notes';
import { Search, FileText, Plus, Network, LayoutTemplate, Database, Sparkles, Palette, X } from 'lucide-react';

export const CommandPalette: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const router = useRouter();
  const { isCommandPaletteOpen, setCommandPaletteOpen, setTemplateModalOpen, setThemeModalOpen } = useUIStore();
  const { data: notes } = useNotes(workspaceId);
  const { mutateAsync: createNote } = useCreateNote();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredNotes = notes?.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const handleCreateNew = async () => {
    const note = await createNote({
      workspaceId,
      title: query.trim() || 'Untitled Note',
    });
    setCommandPaletteOpen(false);
    router.push(`/${workspaceId}/notes/${note.id}`);
  };

  const handleNavigate = (path: string) => {
    setCommandPaletteOpen(false);
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-dropdown w-full max-w-xl rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, jump to graph, or type command..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        {/* Action Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
            Quick Actions
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Create Note: "{query || 'Untitled'}"</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(`/${workspaceId}/graph`)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground cursor-pointer"
          >
            <Network className="w-4 h-4 text-purple-400" />
            <span>Open Interactive Knowledge Graph</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCommandPaletteOpen(false);
              setTemplateModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground cursor-pointer"
          >
            <LayoutTemplate className="w-4 h-4 text-emerald-400" />
            <span>Browse Template Blueprints</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCommandPaletteOpen(false);
              setThemeModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground cursor-pointer"
          >
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Change Theme & Color Studio</span>
          </button>

          {/* Note Matches */}
          {filteredNotes.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-2">
                Notes ({filteredNotes.length})
              </div>
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleNavigate(`/${workspaceId}/notes/${note.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground cursor-pointer"
                >
                  <span className="text-base">{note.icon || '📄'}</span>
                  <span className="truncate flex-1">{note.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
