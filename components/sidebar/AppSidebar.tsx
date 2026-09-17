'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserProfile } from './UserProfile';
import { NoteTree } from './NoteTree';
import { CanvasList } from './CanvasList';
import { useWorkspace, useWorkspaceMembers, useWorkspaceInvites } from '@/hooks/use-workspace';
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
  X,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Users,
  UserPlus,
} from 'lucide-react';

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 210;
const MAX_SIDEBAR_WIDTH = 500;
const WIDE_SIDEBAR_WIDTH = 380;

export const AppSidebar: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isSidebarOpen,
    toggleSidebar,
    setCommandPaletteOpen,
    setTemplateModalOpen,
    setThemeModalOpen,
    setInviteModalOpen,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    toggleMobileSidebar,
  } = useUIStore();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId);
  const { data: notes } = useNotes(workspaceId);
  const { mutateAsync: createNote, isPending: isCreatingNote } = useCreateNote();
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
    return syncEngine.subscribe((state) => setSyncState(state));
  }, []);

  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ─── Resizable & Expandable Sidebar Width ───
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // ─── Collapsible Sections ───
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    notes: true,
    whiteboards: true,
    databases: true,
    team: true,
  });

  // ─── In-Sidebar Note Quick Filter ───
  const [noteFilter, setNoteFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedWidth = localStorage.getItem('synapse_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(parsed);
        }
      }
      const savedSections = localStorage.getItem('synapse_sidebar_sections');
      if (savedSections) {
        setExpandedSections(JSON.parse(savedSections));
      }
    } catch (e) {}
  }, []);

  // Keyboard shortcut Ctrl+\ or Cmd+\ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem('synapse_sidebar_sections', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleSidebarWidth = () => {
    const targetWidth = sidebarWidth > 320 ? DEFAULT_SIDEBAR_WIDTH : WIDE_SIDEBAR_WIDTH;
    setSidebarWidth(targetWidth);
    try {
      localStorage.setItem('synapse_sidebar_width', targetWidth.toString());
    } catch (e) {}
  };

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSidebarWidth((current) => {
        try {
          localStorage.setItem('synapse_sidebar_width', current.toString());
        } catch (e) {}
        return current;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCreateNewNote = async () => {
    if (isCreatingNote) return;
    const existingUntitled = (notes || []).filter(
      (n) => n.title && (n.title === 'Untitled Note' || /^Untitled Note \d+$/.test(n.title))
    );
    const nextNum = existingUntitled.length + 1;
    const title = existingUntitled.length === 0 ? 'Untitled Note' : `Untitled Note ${nextNum}`;
    const note = await createNote({ workspaceId, title, icon: '📄' });
    router.push(`/${workspaceId}/notes/${note.id}`);
  };

  const handleCreateNewCanvas = async () => {
    const existingBoards = whiteboards || [];
    const nextNum = existingBoards.length + 1;
    const title = `Whiteboard Canvas #${nextNum}`;
    const newBoard = await createWhiteboard({ workspaceId, title, icon: '🎨', board_type: 'canvas' });
    router.push(`/${workspaceId}/canvas/${newBoard.id}`);
  };

  const favoriteNotes = notes?.filter((n) => n.is_favorite) || [];
  const regularNotes = notes || [];

  // ─── The inner sidebar content (shared between desktop & mobile drawer) ───
  const SidebarContent = ({ onClose, isMobile = false }: { onClose?: () => void; isMobile?: boolean }) => (
    <div className="flex flex-col h-full overflow-hidden text-sidebar-foreground">
      {/* Workspace Header (Notion-Style) */}
      <div className="px-2 pt-2.5 pb-1.5 flex items-center justify-between gap-1 shrink-0 border-b border-border/20">
        <div className="flex-1 min-w-0">
          <WorkspaceSwitcher workspace={workspace || null} />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Desktop Width expand / compact toggle */}
          {!onClose && (
            <button
              type="button"
              onClick={toggleSidebarWidth}
              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer hidden lg:flex"
              title={sidebarWidth > 320 ? 'Compact sidebar width' : 'Expand sidebar width'}
            >
              {sidebarWidth > 320 ? (
                <ChevronsLeft className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <ChevronsRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Desktop collapse btn */}
          {!onClose && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer hidden lg:flex"
              title="Collapse Sidebar (Ctrl+\)"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mobile close btn */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notion Top Action Stack (Calm, uniform height, zero clutter) */}
      <div className="px-2 pt-2 pb-1 space-y-0.5 text-[13px] shrink-0">
        {/* Search / Quick Jump */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground shrink-0" />
            <span>Search</span>
          </div>
          <kbd className="text-[10px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground hidden sm:inline">
            Ctrl+K
          </kbd>
        </button>

        {/* All Notes */}
        <Link
          href={`/${workspaceId}/notes`}
          onClick={() => onClose?.()}
          className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
            pathname === `/${workspaceId}/notes`
              ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
          }`}
        >
          <FileText className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>All Notes</span>
        </Link>

        {/* Knowledge Graph */}
        <Link
          href={`/${workspaceId}/graph`}
          onClick={() => onClose?.()}
          className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
            pathname === `/${workspaceId}/graph`
              ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
          }`}
        >
          <Network className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>Knowledge Graph</span>
        </Link>

        {/* Whiteboard & Canvas */}
        <Link
          href={`/${workspaceId}/canvas`}
          onClick={() => onClose?.()}
          className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
            pathname === `/${workspaceId}/canvas`
              ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
          }`}
        >
          <Palette className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>Whiteboard & Canvas</span>
        </Link>

        {/* Databases & Sprint */}
        <Link
          href={`/${workspaceId}/databases`}
          onClick={() => onClose?.()}
          className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
            pathname === `/${workspaceId}/databases`
              ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
          }`}
        >
          <Database className="w-4 h-4 text-muted-foreground/70 shrink-0" />
          <span>Databases & Sprint</span>
        </Link>

        {/* New Note Button (Notion-style row) */}
        <button
          type="button"
          onClick={handleCreateNewNote}
          disabled={isCreatingNote}
          className="w-full flex items-center justify-between px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer group text-left disabled:opacity-50"
          title="Create New Note"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground shrink-0" />
            <span>{isCreatingNote ? 'Creating...' : 'New Page'}</span>
          </div>
          <kbd className="text-[10px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground hidden sm:inline">
            Ctrl+N
          </kbd>
        </button>
      </div>

      {/* Scrollable & Expandable Sections (With Notion Breathing Room) */}
      <div className="flex-1 overflow-y-auto pt-2 pb-3 space-y-3 min-h-0 custom-scrollbar">
        {/* Favorites Section */}
        {favoriteNotes.length > 0 && (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleSection('favorites')}
              className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground uppercase group cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1">
                <ChevronRight
                  className={`w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-150 ${
                    expandedSections.favorites ? 'rotate-90' : ''
                  }`}
                />
                <span>Favorites</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground">
                {favoriteNotes.length}
              </span>
            </button>
            {expandedSections.favorites && (
              <div className="mt-0.5">
                <NoteTree notes={favoriteNotes} workspaceId={workspaceId} />
              </div>
            )}
          </div>
        )}

        {/* Notes / Pages Section */}
        <div className="space-y-0.5">
          <div className="group px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground uppercase transition-colors">
            <button
              type="button"
              onClick={() => toggleSection('notes')}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group-hover:text-foreground flex-1 text-left"
            >
              <ChevronRight
                className={`w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-150 ${
                  expandedSections.notes ? 'rotate-90' : ''
                }`}
              />
              <span>Notes</span>
            </button>

            {/* Hover-only quick actions for clean, uncongested Notion feel */}
            <div className="flex items-center gap-0.5">
              {/* Quick in-sidebar filter button (visible on group hover OR when filter active) */}
              <button
                type="button"
                onClick={() => {
                  setIsFilterActive((prev) => !prev);
                  if (!expandedSections.notes) toggleSection('notes');
                  setTimeout(() => filterInputRef.current?.focus(), 50);
                }}
                className={`p-0.5 rounded hover:bg-secondary/70 transition-colors cursor-pointer ${
                  isFilterActive || noteFilter
                    ? 'text-indigo-400 bg-secondary/80 opacity-100'
                    : 'opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-foreground'
                }`}
                title="Filter notes in sidebar"
              >
                <Filter className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleCreateNewNote}
                disabled={isCreatingNote}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary/70 text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                title="Create New Note"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Filter Input */}
          {expandedSections.notes && (isFilterActive || noteFilter) && (
            <div className="px-2 py-1">
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-muted-foreground/60 absolute left-2 pointer-events-none" />
                <input
                  ref={filterInputRef}
                  type="text"
                  value={noteFilter}
                  onChange={(e) => setNoteFilter(e.target.value)}
                  placeholder="Filter notes..."
                  className="w-full pl-7 pr-6 py-1 text-xs bg-neutral-200/40 dark:bg-white/[0.04] border border-border/40 rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
                {noteFilter && (
                  <button
                    type="button"
                    onClick={() => setNoteFilter('')}
                    className="absolute right-1.5 p-0.5 text-muted-foreground/60 hover:text-foreground cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {expandedSections.notes && (
            <div className="mt-0.5">
              <NoteTree notes={regularNotes} workspaceId={workspaceId} searchQuery={noteFilter} />
            </div>
          )}
        </div>

        {/* Whiteboards & Canvases */}
        <div className="space-y-0.5">
          <div className="group px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground uppercase transition-colors">
            <button
              type="button"
              onClick={() => toggleSection('whiteboards')}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group-hover:text-foreground flex-1 text-left"
            >
              <ChevronRight
                className={`w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-150 ${
                  expandedSections.whiteboards ? 'rotate-90' : ''
                }`}
              />
              <span>Whiteboards & Canvas</span>
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleCreateNewCanvas}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary/70 text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer"
                title="Create New Whiteboard / Canvas"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {expandedSections.whiteboards && (
            <div className="mt-0.5">
              <CanvasList
                whiteboards={whiteboards || []}
                workspaceId={workspaceId}
                baseRoute="canvas"
                emptyText="No canvases yet."
              />
            </div>
          )}
        </div>

        {/* Databases */}
        <div className="space-y-0.5">
          <div className="group px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground uppercase transition-colors">
            <button
              type="button"
              onClick={() => toggleSection('databases')}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group-hover:text-foreground flex-1 text-left"
            >
              <ChevronRight
                className={`w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-150 ${
                  expandedSections.databases ? 'rotate-90' : ''
                }`}
              />
              <span>Databases</span>
            </button>
          </div>

          {expandedSections.databases && (
            <div className="space-y-0.5 px-1.5 mt-0.5">
              {databases?.map((db) => {
                const isActive = pathname === `/${workspaceId}/databases`;
                return (
                  <Link
                    key={db.id}
                    href={`/${workspaceId}/databases`}
                    title={db.title || 'Sprint Roadmap & Tasks'}
                    className={`group flex items-center justify-between px-2 py-1 rounded-md text-[13px] transition-colors ${
                      isActive
                        ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0 leading-none">{db.icon || '🎯'}</span>
                      <span className="truncate">{db.title || 'Sprint Roadmap & Tasks'}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Collaborators Section */}
        <div className="space-y-0.5">
          <div className="group px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground uppercase transition-colors">
            <button
              type="button"
              onClick={() => toggleSection('team')}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group-hover:text-foreground flex-1 text-left"
            >
              <ChevronRight
                className={`w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-transform duration-150 ${
                  expandedSections.team ? 'rotate-90' : ''
                }`}
              />
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-indigo-400" />
                <span>Team ({members.length})</span>
              </span>
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setInviteModalOpen(true);
                  onClose?.();
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary/70 text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer"
                title="Manage Team & Invites"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {expandedSections.team && (
            <div className="space-y-0.5 px-1.5 mt-0.5">
              {members.map((m) => {
                const isOwner = m.role === 'owner';
                const name = m.name || m.email?.split('@')[0] || 'Member';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setInviteModalOpen(true);
                      onClose?.();
                    }}
                    className="w-full group flex items-center justify-between px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
                    title={`${name} (${m.role})`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                          isOwner
                            ? 'bg-amber-500'
                            : m.role === 'admin'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground/60 group-hover:text-muted-foreground shrink-0">
                      {m.role}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setInviteModalOpen(true);
                  onClose?.();
                }}
                className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[12px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Member</span>
                </div>
                {invites.some((i) => i.status === 'pending') && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-mono font-medium">
                    {invites.filter((i) => i.status === 'pending').length} pending
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notion-Style Docked Footer Utilities */}
      <div className="shrink-0 border-t border-border/25 pt-1">
        <div className="px-2 py-0.5 space-y-0.5 text-[13px]">
          {/* Templates */}
          <button
            type="button"
            onClick={() => {
              setTemplateModalOpen(true);
              onClose?.();
            }}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-md font-normal text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
          >
            <LayoutTemplate className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            <span>Templates</span>
          </button>

          {/* Theme Studio */}
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-md font-normal text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
            title="Themes & Appearance Studio"
          >
            <Palette className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            <span>Appearance & Themes</span>
          </button>

          {/* Settings */}
          <Link
            href={`/${workspaceId}/settings`}
            onClick={() => onClose?.()}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-md font-normal text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] transition-colors text-left"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>

        {/* User Profile & Sync indicator row */}
        <div className="px-2 py-1 border-t border-border/20 mt-1 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <UserProfile />
          </div>
          <div
            className="p-1.5 flex items-center gap-1.5 shrink-0"
            title={syncState.isSyncing ? 'Syncing...' : syncState.isOnline ? 'Local Engine Active' : 'Offline Mode'}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                syncState.isSyncing
                  ? 'bg-sky-400 animate-pulse'
                  : syncState.isOnline
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <>
      {/* ─── MOBILE: Hamburger trigger button ─── */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
          left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
        }}
        className="fixed z-40 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-card/95 backdrop-blur-md border border-border/80 text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-md lg:hidden flex items-center justify-center touch-manipulation"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ─── MOBILE: Drawer and Backdrop (Portaled to document.body) ─── */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] lg:hidden transition-all duration-300 ${
              isMobileOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
            }`}
          >
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ${
                isMobileOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Drawer */}
            <aside
              style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
                paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0.5rem))',
              }}
              className={`
                fixed inset-y-0 left-0 w-80 max-w-[88vw] h-full h-dvh
                bg-[#15161c] border-r border-sidebar-border/50 shadow-2xl
                flex flex-col select-none
                transition-transform duration-300 ease-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent onClose={() => setIsMobileOpen(false)} isMobile />
            </aside>
          </div>,
          document.body
        )}

      {/* ─── DESKTOP: Collapsed reopen button ─── */}
      {!isSidebarOpen && (
        <div className="fixed top-3 left-3 z-40 hidden lg:flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSidebar}
            className="px-2.5 py-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shadow-md hover:scale-105 flex items-center gap-1.5 text-xs font-medium"
            title="Expand Sidebar (Ctrl+\)"
          >
            <PanelLeft className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-semibold">Sidebar</span>
          </button>
        </div>
      )}

      {/* ─── DESKTOP: Persistent Resizable & Expandable Sidebar ─── */}
      {isSidebarOpen && (
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="hidden lg:flex relative h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/50 flex-col shrink-0 select-none z-30 transition-[width] duration-75"
        >
          <SidebarContent />

          {/* Desktop Interactive Drag Resizer */}
          <div
            onMouseDown={startResizing}
            onDoubleClick={() => {
              setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
              try {
                localStorage.setItem('synapse_sidebar_width', DEFAULT_SIDEBAR_WIDTH.toString());
              } catch (e) {}
            }}
            className={`absolute top-0 -right-1 w-2.5 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors z-40 group flex items-center justify-center ${
              isResizing ? 'bg-indigo-500/50' : ''
            }`}
            title="Drag to resize sidebar • Double-click to reset"
          >
            <div className="w-0.5 h-8 rounded-full bg-border/60 group-hover:bg-indigo-400 transition-colors" />
          </div>
        </aside>
      )}

      {/* Dragging Full-screen Overlay to prevent text selection and capture mouse movements */}
      {isResizing && (
        <div className="fixed inset-0 z-[99999] cursor-col-resize select-none pointer-events-auto" />
      )}
    </>
  );
};
