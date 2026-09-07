'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/stores/use-ui-store';
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvites,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useRevokeInvite,
} from '@/hooks/use-workspace';
import { WorkspaceRole } from '@/types/domain';
import {
  X,
  Users,
  Mail,
  Copy,
  Check,
  Shield,
  UserX,
  Trash2,
  ExternalLink,
  Crown,
  Share2,
  Lock,
} from 'lucide-react';

export const InviteMembersModal: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { isInviteModalOpen, setInviteModalOpen } = useUIStore();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId);

  const { mutateAsync: inviteMember, isPending: isInviting } = useInviteMember();
  const { mutateAsync: updateRole } = useUpdateMemberRole();
  const { mutateAsync: removeMember } = useRemoveMember();
  const { mutateAsync: revokeInvite } = useRevokeInvite();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('editor');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');

  if (!isInviteModalOpen) return null;

  const handleClose = () => {
    setEmail('');
    setRole('editor');
    setCopiedCode(null);
    setInviteModalOpen(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && invites.length > 0) return;

    try {
      const res = await inviteMember({
        workspaceId,
        email: email.trim() || undefined,
        role,
      });

      setEmail('');
      if (!email.trim() && res.invite?.invite_code) {
        handleCopyLink(res.invite.invite_code);
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/invite/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const latestInvite = invites[invites.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
              {workspace?.icon || '👥'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Invite to {workspace?.name || 'Workspace'}
                </h2>
                {workspace?.type === 'private' ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" /> Shared
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage workspace members, assign permissions, and share invite links
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-border/40 px-5 pt-3 bg-secondary/10">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invite'
                ? 'border-indigo-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Invite & Share</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-indigo-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'invite' ? (
            <>
              {/* Invite by Email */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                  Invite via Email
                </label>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                    className="px-3 py-2 text-xs font-medium bg-secondary border border-border/60 rounded-xl text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>

                  <button
                    type="submit"
                    disabled={!email.trim() || isInviting}
                    className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    {isInviting ? 'Inviting...' : 'Invite'}
                  </button>
                </form>
                <div className="text-[11px] text-muted-foreground mt-1.5">
                  Editors can create and edit notes, canvases & databases. Admins can also manage members.
                </div>
              </div>

              {/* Shareable Invite Link */}
              <div className="pt-4 border-t border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Shareable Invite Link</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Anyone with this secret link can join this workspace as an {role}.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-secondary/50 border border-border/60 rounded-xl">
                  <div className="flex-1 font-mono text-[11px] text-muted-foreground truncate px-1">
                    {latestInvite
                      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${latestInvite.invite_code}`
                      : 'Generate an invite link to share with your team'}
                  </div>

                  {latestInvite ? (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(latestInvite.invite_code)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        copiedCode === latestInvite.invite_code
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {copiedCode === latestInvite.invite_code ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        inviteMember({
                          workspaceId,
                          role,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Create Link</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="pt-4 border-t border-border/40">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5">
                    Active Invite Links ({invites.length})
                  </div>
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2.5 bg-secondary/30 border border-border/40 rounded-xl text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-mono text-[11px] font-semibold text-foreground truncate">
                            Code: <span className="text-indigo-400">{inv.invite_code}</span>
                            {inv.email && ` (${inv.email})`}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Role: {inv.role} • Expires in 7 days
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.invite_code)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                            title="Copy link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeInvite({ inviteId: inv.id, workspaceId })}
                            className="p-1.5 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Revoke invite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Members List Tab */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Current Members ({members.length})
              </div>
              <div className="space-y-2">
                {members.map((member) => {
                  const isOwner = member.role === 'owner';
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 border border-border/40 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {member.email ? member.email[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span>{member.email || `User (${member.user_id})`}</span>
                            {isOwner && (
                              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.2 rounded">
                                <Crown className="w-2.5 h-2.5" /> Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Joined {new Date(member.created_at || member.joined_at || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <span className="text-xs font-semibold text-muted-foreground px-2 py-1">
                            Owner
                          </span>
                        ) : (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                updateRole({
                                  memberId: member.id,
                                  role: e.target.value as WorkspaceRole,
                                  workspaceId,
                                })
                              }
                              className="px-2 py-1 text-xs font-medium bg-secondary border border-border/60 rounded-lg text-foreground cursor-pointer focus:outline-hidden"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeMember({ memberId: member.id, workspaceId })}
                              className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border/40 bg-secondary/10">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
