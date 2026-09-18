'use client';

import React from 'react';
import { useWorkspace, useWorkspaceMembers, useWorkspaceInvites } from '@/hooks/use-workspace';
import { useUIStore } from '@/stores/use-ui-store';
import { Users, UserPlus, Shield, Crown, Clock, AlertCircle } from 'lucide-react';

interface WorkspaceHeaderProps {
  workspaceId: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ workspaceId }) => {
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId);
  const { setInviteModalOpen } = useUIStore();

  const isShared = workspace?.type === 'shared' || members.length > 1;

  const pendingInvites = invites.filter(
    (i) => i.status === 'pending' && (!i.expires_at || new Date(i.expires_at) > new Date())
  );
  const acceptedInvites = invites.filter((i) => i.status === 'accepted' || i.status === 'consumed');
  const rejectedInvites = invites.filter((i) => i.status === 'rejected');

  // Deterministic sort so all users see identical avatars in the exact same order
  const sortedMembers = [...members].sort((a, b) => {
    const roleRank: Record<string, number> = { owner: 0, admin: 1, editor: 2, viewer: 3 };
    const rankA = roleRank[a.role] ?? 99;
    const rankB = roleRank[b.role] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || a.email || '').localeCompare(b.name || b.email || '');
  });

  // Limit display to first 5 avatars
  const displayMembers = sortedMembers.slice(0, 5);
  const overflowCount = sortedMembers.length > 5 ? sortedMembers.length - 5 : 0;

  return (
    <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 min-h-[48px]">
      {/* Left: Workspace Identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-secondary/80 border border-border/60 flex items-center justify-center text-sm shrink-0">
          {workspace?.icon || '🧠'}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">
            {workspace?.name || 'Workspace'}
          </span>
          {isShared ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Shared Space
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border/50 shrink-0">
              Private
            </span>
          )}
        </div>
      </div>

      {/* Right: Team Collaborations & Presence */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Collaborators Avatar Stack */}
        {members.length > 0 && (
          <div
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center -space-x-2 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer p-0.5 rounded-full"
            title="Click to manage team members & invitations"
          >
            {displayMembers.map((member) => {
              const isOwner = member.role === 'owner';
              const name = member.name || member.email?.split('@')[0] || 'Member';
              const initial = name.charAt(0).toUpperCase();

              return (
                <div
                  key={member.id}
                  className="relative group"
                  title={`${name} (${member.role})${member.email ? ` • ${member.email}` : ''}`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-xs ring-2 ring-background ${
                      isOwner
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-600'
                        : member.role === 'admin'
                        ? 'bg-gradient-to-tr from-purple-500 to-indigo-600'
                        : 'bg-gradient-to-tr from-blue-500 to-cyan-600'
                    }`}
                  >
                    {initial}
                  </div>
                  {/* Small online indicator */}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-background" />
                </div>
              );
            })}

            {overflowCount > 0 && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-secondary border border-border/80 flex items-center justify-center text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
                +{overflowCount}
              </div>
            )}
          </div>
        )}

        {/* Pending Invites Alert Badge */}
        {pendingInvites.length > 0 && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title={`${pendingInvites.length} invitation(s) pending response`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{pendingInvites.length} Pending</span>
          </button>
        )}

        {/* Rejected Invites Alert Badge (if any) */}
        {rejectedInvites.length > 0 && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title={`${rejectedInvites.length} invitation(s) declined`}
          >
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{rejectedInvites.length} Declined</span>
          </button>
        )}

        {/* Invite & Collaborate Button */}
        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Collaborate</span>
          <span className="sm:hidden">Team</span>
        </button>
      </div>
    </header>
  );
};
