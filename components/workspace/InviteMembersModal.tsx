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
import { useAuth } from '@/hooks/use-auth';
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
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

function getRecipientName(email: string): string {
  const localPart = email.split('@')[0] || '';
  const clean = localPart.replace(/[0-9]+$/g, '').replace(/[._-]+/g, ' ').trim();
  if (!clean) return 'there';
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildEmailTemplate(recipientEmail: string, inviteUrl?: string): string {
  const username = getRecipientName(recipientEmail);
  return `Hey ${username}, hope you’re doing well!
I am Subhadeep and I’ve been working on an application called Synapse — a productivity and knowledge-management platform with combined features of tools like Notion, Obsidian, Evernote, and Trello, with a few additional features of its own.
It’s now live, and I’d love for you to have a look:
Synapse: https://synapse-web-frontend-vercel.vercel.app/login${inviteUrl ? `\nWorkspace Invite: ${inviteUrl}` : ''}
Feel free to explore it whenever you get a chance. And if you come across any bugs, things that could be improved, or simply have an idea that could make the product better, please feel free to reach out.
Would love to hear what you think!
Thanks,
Subhadeep`;
}

export const InviteMembersModal: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { user } = useAuth();
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
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<{ email: string; code?: string } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  if (!isInviteModalOpen) return null;

  const handleClose = () => {
    setEmail('');
    setRole('editor');
    setCopiedCode(null);
    setInviteError(null);
    setActiveTemplate(null);
    setInviteModalOpen(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && invites.length > 0) return;

    setInviteError(null);
    try {
      const targetEmail = email.trim();
      const res = await inviteMember({
        workspaceId,
        email: targetEmail || undefined,
        role,
      });

      setEmail('');
      if (targetEmail) {
        setActiveTemplate({
          email: targetEmail,
          code: res.invite?.invite_code,
        });
      } else if (res.invite?.invite_code) {
        handleCopyLink(res.invite.invite_code);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite.');
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

  const handleSendEmailApp = (targetEmail: string, code?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = code ? `${origin}/invite/${code}` : undefined;
    const body = buildEmailTemplate(targetEmail, inviteUrl);
    const subject = 'Invitation to explore Synapse';
    const mailto = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleCopyTemplateText = (targetEmail: string, code?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = code ? `${origin}/invite/${code}` : undefined;
    const body = buildEmailTemplate(targetEmail, inviteUrl);
    navigator.clipboard.writeText(body);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (inviteError) setInviteError(null);
                      }}
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

                {inviteError && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{inviteError}</div>
                    <button
                      type="button"
                      onClick={() => setInviteError(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground mt-1.5">
                  Editors can create and edit notes, canvases & databases. Admins can also manage members.
                </div>
              </div>

              {/* Ready-to-Send Email Template Card */}
              {activeTemplate && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ready to send invite to {activeTemplate.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTemplate(null);
                        setCopiedTemplate(false);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Personalized message for <strong>{activeTemplate.email}</strong>:
                  </p>

                  <div className="p-3 bg-secondary/80 border border-border/60 rounded-xl text-xs font-sans text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all">
                    {buildEmailTemplate(
                      activeTemplate.email,
                      activeTemplate.code
                        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${activeTemplate.code}`
                        : undefined
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendEmailApp(activeTemplate.email, activeTemplate.code)}
                      className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send via Email App</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplateText(activeTemplate.email, activeTemplate.code)}
                      className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedTemplate ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

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

              {/* Active Invite Links */}
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
                          {inv.email && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveTemplate({
                                  email: inv.email!,
                                  code: inv.invite_code,
                                })
                              }
                              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Send or view email template"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                  const cachedEmail =
                    typeof window !== 'undefined'
                      ? localStorage.getItem('synapse_current_user_email')
                      : null;
                  const ownerFallbackEmail = user?.email || cachedEmail || 'owner@synapse.io';
                  const displayEmail =
                    isOwner &&
                    (!member.email ||
                      member.email === 'user@synapse.local' ||
                      member.email === 'guest@synapse.local')
                      ? ownerFallbackEmail
                      : member.email;
                  const displayName = member.name || displayEmail?.split('@')[0] || 'User';
                  const initial = (displayEmail || displayName || 'U').charAt(0).toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 border border-border/40 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span>{displayEmail || `User (${member.user_id})`}</span>
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
                              className="px-2.5 py-1 text-xs bg-secondary border border-border/50 rounded-lg text-foreground cursor-pointer focus:outline-hidden"
                            >
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
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
        <div className="p-4 border-t border-border/40 bg-secondary/10 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border/60 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
