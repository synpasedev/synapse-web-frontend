'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Workspace } from '@/types/domain';
import { useWorkspaces } from '@/hooks/use-workspace';
import { useUIStore } from '@/stores/use-ui-store';
import {
  ChevronDown,
  Check,
  Plus,
  Users,
  Lock,
  Settings,
  UserPlus,
  Sparkles,
} from 'lucide-react';

export const WorkspaceSwitcher: React.FC<{ workspace: Workspace | null }> = ({ workspace }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allWorkspaces = [] } = useWorkspaces();
  const {
    setCreateWorkspaceModalOpen,
    setInviteModalOpen,
    setWorkspaceSettingsOpen,
  } = useUIStore();

  const privateWorkspaces = allWorkspaces.filter((w) => (w.type || 'private') === 'private');
  const sharedWorkspaces = allWorkspaces.filter((w) => w.type === 'shared');

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

  const isShared = workspace?.type === 'shared';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Current Workspace Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer border border-border/40 text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
            {workspace?.icon || '🧠'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span>{workspace?.name || 'Workspace'}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              {isShared ? (
                <>
                  <Users className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Shared ({workspace?.members_count || 1})</span>
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Private Brain</span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Notion-Style Switcher Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-border/40 bg-secondary/20 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Workspaces
            </span>
            <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
              {allWorkspaces.length} total
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-3">
            {/* Private Section */}
            <div>
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span>Private</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {privateWorkspaces.map((ws) => {
                  const isCurrent = ws.id === workspace?.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSelectWorkspace(ws.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-secondary font-semibold text-foreground'
                          : 'hover:bg-secondary/50 text-foreground/80 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{ws.icon || '🧠'}</span>
                        <div className="min-w-0">
                          <div className="text-xs truncate">{ws.name}</div>
                          <div className="text-[10px] text-muted-foreground">Personal</div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shared Section */}
            {sharedWorkspaces.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Users className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Shared & Collaboration</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {sharedWorkspaces.map((ws) => {
                    const isCurrent = ws.id === workspace?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => handleSelectWorkspace(ws.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-secondary font-semibold text-foreground'
                            : 'hover:bg-secondary/50 text-foreground/80 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{ws.icon || '🚀'}</span>
                          <div className="min-w-0">
                            <div className="text-xs truncate">{ws.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {ws.members_count || 1} {ws.members_count === 1 ? 'member' : 'members'}
                            </div>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
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
