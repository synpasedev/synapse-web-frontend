'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Workspace } from '@/types/domain';
import { useWorkspaces, useWorkspaceMembers, useWorkspaceInvites } from '@/hooks/use-workspace';
import { useUIStore } from '@/stores/use-ui-store';
import { useAuth } from '@/hooks/use-auth';
import {
  ChevronDown,
  Check,
  Plus,
  Users,
  Lock,
  Settings,
  UserPlus,
  LogOut,
  User,
  Shield,
} from 'lucide-react';

export const WorkspaceSwitcher: React.FC<{ workspace: Workspace | null }> = ({ workspace }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allWorkspaces = [] } = useWorkspaces();
  const { data: members = [] } = useWorkspaceMembers(workspace?.id || '');
  const { data: invites = [] } = useWorkspaceInvites(workspace?.id || '');
  const { user, signOut } = useAuth();

  const {
    setCreateWorkspaceModalOpen,
    setInviteModalOpen,
    setWorkspaceSettingsOpen,
  } = useUIStore();

  const isWorkspaceShared = (w: Workspace) => w.type === 'shared' || (w.members_count || 1) > 1;
  const privateWorkspaces = allWorkspaces.filter((w) => !isWorkspaceShared(w));
  const sharedWorkspaces = allWorkspaces.filter((w) => isWorkspaceShared(w));

  const isShared = workspace ? isWorkspaceShared(workspace) : false;

  // Collapsible dropdown accordions inside the menu (Notion-style)
  const [isSharedOpen, setIsSharedOpen] = useState(true);
  const [isPrivateOpen, setIsPrivateOpen] = useState(true);
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectWorkspace = (wsId: string) => {
    setIsOpen(false);
    if (wsId !== workspace?.id) {
      router.push(`/${wsId}/notes`);
    }
  };

  const userEmail = user?.email || 'local@synapse.io';
  const userName = user?.name || userEmail.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const pendingInvitesCount = invites.filter(
    (i) => i.status === 'pending' && (!i.expires_at || new Date(i.expires_at) > new Date())
  ).length;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Current Workspace Button (Notion-Style Header Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-secondary/80 flex items-center justify-center text-foreground text-xs font-semibold shrink-0">
            {workspace?.icon || '🧠'}
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-foreground truncate">
              {workspace?.name || 'Workspace'}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium shrink-0 flex items-center gap-1 ${
                isShared
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isShared ? (
                <>
                  <Users className="w-2.5 h-2.5" />
                  Shared
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  Private
                </>
              )}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Notion-Style Switcher Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-foreground">
          {/* 1. Account Header (Notion Account Section) */}
          <div className="p-3 border-b border-border/40 bg-secondary/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                {user ? userInitial : <User className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                  <span>{userName}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                    {user ? 'Active' : 'Guest'}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{userEmail}</div>
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Workspaces Section (Collapsible Dropdowns Inside the Menu) */}
          <div className="max-h-80 overflow-y-auto p-1.5 space-y-2 custom-scrollbar">
            {/* Header label */}
            <div className="px-2 pt-1 pb-0.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Workspaces
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {allWorkspaces.length} total
              </span>
            </div>

            {/* Shared Workspaces Dropdown Accordion */}
            <div className="rounded-xl bg-secondary/15 border border-border/25 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsSharedOpen(!isSharedOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider hover:bg-secondary/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-indigo-400" />
                  <span>Shared Workspaces</span>
                  <span className="text-[10px] font-medium font-mono bg-indigo-500/15 text-indigo-400 px-1.5 py-0.2 rounded-full">
                    {sharedWorkspaces.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 ${
                    isSharedOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isSharedOpen && (
                <div className="p-1 space-y-0.5 border-t border-border/20">
                  {sharedWorkspaces.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground/70 italic text-center">
                      No shared workspaces yet
                    </div>
                  ) : (
                    sharedWorkspaces.map((ws) => {
                      const isCurrent = ws.id === workspace?.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => handleSelectWorkspace(ws.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
                            isCurrent
                              ? 'bg-secondary font-semibold text-foreground shadow-xs'
                              : 'hover:bg-secondary/50 text-foreground/80 hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{ws.icon || '🚀'}</span>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-medium">{ws.name}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>{ws.members_count || 1} {ws.members_count === 1 ? 'member' : 'members'}</span>
                                {isCurrent && (
                                  <span className="text-indigo-400">• Active</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Private Workspaces Dropdown Accordion */}
            <div className="rounded-xl bg-secondary/15 border border-border/25 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPrivateOpen(!isPrivateOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider hover:bg-secondary/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Private Workspaces</span>
                  <span className="text-[10px] font-medium font-mono bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded-full">
                    {privateWorkspaces.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 ${
                    isPrivateOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isPrivateOpen && (
                <div className="p-1 space-y-0.5 border-t border-border/20">
                  {privateWorkspaces.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground/70 italic text-center">
                      No private workspaces
                    </div>
                  ) : (
                    privateWorkspaces.map((ws) => {
                      const isCurrent = ws.id === workspace?.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => handleSelectWorkspace(ws.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
                            isCurrent
                              ? 'bg-secondary font-semibold text-foreground shadow-xs'
                              : 'hover:bg-secondary/50 text-foreground/80 hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{ws.icon || '🧠'}</span>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-medium">{ws.name}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>Personal</span>
                                {isCurrent && (
                                  <span className="text-emerald-400">• Active</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. Current Workspace Team Drawer (Integrated in Menu for Shared Spaces) */}
            {isShared && (
              <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsTeamExpanded(!isTeamExpanded)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider hover:bg-indigo-500/10 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    <span>Team & Members</span>
                    <span className="text-[10px] font-medium font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full">
                      {members.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isTeamExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {isTeamExpanded && (
                  <div className="p-2 space-y-1.5 border-t border-indigo-500/15">
                    <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                      {members.map((m) => {
                        const name = m.name || m.email?.split('@')[0] || 'Member';
                        const isOwner = m.role === 'owner';
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between px-2 py-1 rounded-md text-[11px] bg-secondary/30 text-foreground"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${
                                  isOwner ? 'bg-amber-500' : 'bg-indigo-500'
                                }`}
                              >
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{name}</span>
                            </div>
                            <span className="text-[9px] uppercase font-mono text-muted-foreground">
                              {m.role}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setInviteModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Invite Collaborators</span>
                      {pendingInvitesCount > 0 && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded-full font-mono">
                          {pendingInvitesCount} pending
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Quick Actions Footer (Notion-Style) */}
          <div className="p-1.5 border-t border-border/40 bg-secondary/15 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setInviteModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Invite Members</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setCreateWorkspaceModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setWorkspaceSettingsOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Workspace Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
