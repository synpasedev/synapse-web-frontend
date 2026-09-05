'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserProfile } from './UserProfile';
import { NoteTree } from './NoteTree';
import { CanvasList } from './CanvasList';
import { useWorkspace } from '@/hooks/use-workspace';
import { useNotes, useCreateNote } from '@/hooks/use-notes';
import { useWhiteboards, useCreateWhiteboard } from '@/hooks/use-whiteboard';
import { useDatabases } from '@/hooks/use-databases';
import { useUIStore } from '@/stores/use-ui-store';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { SyncState } from '@/types/sync';
import {
  FileText,
  Network,
  Palette,
  Database,
  LayoutTemplate,
  Plus,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

export const AppSidebar: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar, setCommandPaletteOpen, setTemplateModalOpen, setThemeModalOpen } = useUIStore();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: notes } = useNotes(workspaceId);
  const { mutateAsync: createNote } = useCreateNote();
  const { data: whiteboards } = useWhiteboards(workspaceId);
  const { mutateAsync: createWhiteboard } = useCreateWhiteboard();
  const { data: databases } = useDatabases(workspaceId);

  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    return syncEngine.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  const handleCreateNewNote = async () => {
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

  const handleCreateNewCanvas = async () => {
    const existingBoards = whiteboards || [];
    const nextNum = existingBoards.length + 1;
    const title = `Canvas Board #${nextNum}`;
    const newBoard = await createWhiteboard({
      workspaceId,
      title,
      icon: '🎨',
    });
    router.push(`/${workspaceId}/canvas/${newBoard.id}`);
  };

  const favoriteNotes = notes?.filter((n) => n.is_favorite) || [];
  const regularNotes = notes || [];

  if (!isSidebarOpen) {
    return (
      <div className="fixed top-4 left-4 z-40">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-card/80 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-sm"
          title="Open Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-60 h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 flex flex-col shrink-0 select-none z-30 transition-all">
      {/* Workspace Header */}
      <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <WorkspaceSwitcher workspace={workspace || null} />
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="p-2.5 space-y-1.5">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary/80 border border-border/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-indigo-300" />
            <span>Search / Jump</span>
          </div>
          <kbd className="text-[10px] font-mono bg-card px-1 py-0.5 rounded text-muted-foreground/70 border border-border/50">
            Ctrl+K
          </kbd>
        </button>

        <button
          type="button"
          onClick={handleCreateNewNote}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="px-2.5 py-1.5 space-y-0.5 border-b border-border/30 text-xs">
        <Link
          href={`/${workspaceId}/notes`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
            pathname === `/${workspaceId}/notes`
              ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-300" />
          <span>All Notes</span>
        </Link>

        <Link
          href={`/${workspaceId}/graph`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
            pathname === `/${workspaceId}/graph`
              ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-purple-300" />
          <span>Knowledge Graph</span>
        </Link>

        <Link
          href={`/${workspaceId}/canvas`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
            pathname === `/${workspaceId}/canvas`
              ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-pink-300" />
          <span>Whiteboard & Canvas</span>
        </Link>

        <Link
          href={`/${workspaceId}/databases`}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
            pathname === `/${workspaceId}/databases`
              ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-300" />
          <span>Databases & Sprint</span>
        </Link>

        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-left cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-amber-300/80" />
          <span>Templates</span>
        </button>
      </div>

      {/* Sidebar Collections: Notes, Canvases, Databases */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-3.5">
        {favoriteNotes.length > 0 && (
          <div>
            <div className="px-3.5 mb-1 text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
              Favorites
            </div>
            <NoteTree notes={favoriteNotes} workspaceId={workspaceId} />
          </div>
        )}

        {/* Notes Section */}
        <div>
          <div className="px-3.5 mb-1 flex items-center justify-between text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
            <span>Notes</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Create New Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono">{regularNotes.length}</span>
            </div>
          </div>
          <NoteTree notes={regularNotes} workspaceId={workspaceId} />
        </div>

        {/* Canvases Section */}
        <div>
          <div className="px-3.5 mb-1 flex items-center justify-between text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
            <span>Canvases</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCreateNewCanvas}
                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Create New Canvas"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono">{whiteboards?.length || 0}</span>
            </div>
          </div>
          <CanvasList whiteboards={whiteboards || []} workspaceId={workspaceId} />
        </div>

        {/* Databases Section */}
        <div>
          <div className="px-3.5 mb-1 flex items-center justify-between text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">
            <span>Databases</span>
            <span className="text-[10px] font-mono">{databases?.length || 0}</span>
          </div>
          <div className="space-y-0.5 px-2">
            {databases?.map((db) => {
              const isActive = pathname === `/${workspaceId}/databases`;
              return (
                <Link
                  key={db.id}
                  href={`/${workspaceId}/databases`}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/20'
                      : 'text-foreground/80 hover:bg-secondary/60 hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{db.icon || '🎯'}</span>
                    <span className="truncate">{db.title || 'Sprint Roadmap & Tasks'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2"><UserProfile /></div>
      {/* Sync Status Footer */}
      <div className="p-2.5 border-t border-border/40 bg-secondary/15 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-h-[20px]">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              syncState.isSyncing
                ? 'bg-sky-400 animate-pulse'
                : syncState.isOnline
                ? 'bg-emerald-400'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-medium text-muted-foreground/80 transition-all duration-300">
            {syncState.isSyncing
              ? 'Syncing...'
              : syncState.isOnline
              ? 'Local Engine Active'
              : 'Offline Mode'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Themes & Appearance Studio"
          >
            <Palette className="w-3.5 h-3.5 text-primary" />
          </button>

          <Link
            href={`/${workspaceId}/settings`}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
};
