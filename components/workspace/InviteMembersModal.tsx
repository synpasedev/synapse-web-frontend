'use client';

import React, { useState, useMemo } from 'react';
import { useUIStore } from '@/stores/use-ui-store';
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvites,
  useInviteMember,
  useBatchInviteMembers,
  useUpdateMemberRole,
  useUpdateMultipleMemberRoles,
  useRemoveMember,
  useRemoveMultipleMembers,
  useRevokeInvite,
  useClearWorkspaceInvites,
} from '@/hooks/use-workspace';
import { WorkspaceRole, WorkspaceMember } from '@/types/domain';
import { useAuth } from '@/hooks/use-auth';
import { getPublicSiteUrl } from '@/lib/url';
import {
  X,
  Users,
  Mail,
  Copy,
  Check,
  Shield,
  UserX,
  Trash2,
  Crown,
  Share2,
  Lock,
  Send,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  Loader2,
  Sparkles,
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
  const siteUrl = getPublicSiteUrl();
  const safeInviteUrl = inviteUrl
    ? (inviteUrl.includes('localhost') ? inviteUrl.replace(/^https?:\/\/localhost(:\d+)?/, siteUrl) : inviteUrl)
    : undefined;

  return `Hey ${username}, hope you’re doing well!
I am Subhadeep and I’ve been working on an application called Synapse — a productivity and knowledge-management platform with combined features of tools like Notion, Obsidian, Evernote, and Trello, with a few additional features of its own.
It’s now live, and I’d love for you to have a look:
Synapse: ${siteUrl}/login${safeInviteUrl ? `\nWorkspace Invite: ${safeInviteUrl}` : ''}
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

  const { mutateAsync: inviteMember, isPending: isInvitingSingle } = useInviteMember();
  const { mutateAsync: batchInviteMembers, isPending: isInvitingBatch } = useBatchInviteMembers();
  const { mutateAsync: updateRole } = useUpdateMemberRole();
  const { mutateAsync: updateMultipleRoles, isPending: isUpdatingBulkRoles } = useUpdateMultipleMemberRoles();
  const { mutateAsync: removeMember } = useRemoveMember();
  const { mutateAsync: removeMultipleMembers, isPending: isRemovingBulk } = useRemoveMultipleMembers();
  const { mutateAsync: revokeInvite } = useRevokeInvite();
  const { mutateAsync: clearWorkspaceInvites, isPending: isClearingInvites } = useClearWorkspaceInvites();

  const isInviting = isInvitingSingle || isInvitingBatch;

  // Invite tab state
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('editor');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'members'>('invite');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<{ email: string; code?: string } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<{
    added: Array<{ email: string; inviteCode: string; memberId: string }>;
    skippedAlreadyMember: string[];
    skippedAlreadyInvited: string[];
  } | null>(null);

  // Nodemailer direct sending state
  const [sendDirectEmail, setSendDirectEmail] = useState<boolean>(true);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  // Members tab state (multi-select & batch manage)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isConfirmingBulkRemove, setIsConfirmingBulkRemove] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [bulkStatusMsg, setBulkStatusMsg] = useState<string | null>(null);

  // Extract parsed emails from email input
  const parsedEmails = useMemo(() => {
    return emailInput
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s.includes('@'));
  }, [emailInput]);

  // Non-owner members for batch selection
  const nonOwnerMembers = useMemo(() => {
    return members.filter((m) => m.role !== 'owner');
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const query = memberSearch.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.email?.toLowerCase().includes(query) ||
        m.name?.toLowerCase().includes(query) ||
        m.role?.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);

  if (!isInviteModalOpen) return null;

  const handleClose = () => {
    setEmailInput('');
    setRole('editor');
    setCopiedCode(null);
    setInviteError(null);
    setActiveTemplate(null);
    setBatchResult(null);
    setEmailFeedback(null);
    setSelectedMemberIds(new Set());
    setIsConfirmingBulkRemove(false);
    setBulkStatusMsg(null);
    setMemberSearch('');
    setInviteModalOpen(false);
  };

  /**
   * Direct email sender via Nodemailer API route
   */
  const sendDirectInviteViaNodemailer = async (
    recipients: string[],
    inviteCodes?: Record<string, string>
  ) => {
    if (recipients.length === 0) return false;
    setIsSendingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await fetch('/api/invite/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          inviteCodes,
          workspaceId,
          workspaceName: workspace?.name,
          workspaceIcon: workspace?.icon,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || data.summary?.sent === 0) {
        if (data.missingConfig) {
          setEmailFeedback({
            type: 'info',
            message: 'Nodemailer SMTP not configured on server.',
            details:
              'Set SMTP_USER and SMTP_PASS (or Gmail App Password) in your .env to enable automatic delivery. You can still send via your email client or copy the message.',
          });
        } else {
          const errorMsg =
            data.error ||
            data.results?.find((r: any) => !r.success)?.error ||
            'Failed to send direct email via Nodemailer.';
          const isResendSandbox =
            errorMsg.includes('resend.com/domains') || errorMsg.includes('testing emails');

          setEmailFeedback({
            type: 'error',
            message: errorMsg,
            details: isResendSandbox
              ? 'Notice: Resend testing mode only allows sending to your registered account email (helpcare.synapse@gmail.com) until you verify a custom domain at resend.com/domains. To send to any recipient email without domain verification, use Gmail with an App Password in your .env!'
              : undefined,
          });
        }
        return false;
      }

      const sentCount = data.summary?.sent ?? recipients.length;
      setEmailFeedback({
        type: 'success',
        message: `Direct invite email${sentCount > 1 ? 's' : ''} sent successfully via Nodemailer to ${sentCount} recipient${sentCount > 1 ? 's' : ''}!`,
      });
      return true;
    } catch (err: any) {
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Error communicating with Nodemailer email service.',
      });
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getEnrichedInviteUrl = (code: string, targetEmail?: string) => {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const base = isLocalhost ? window.location.origin : getPublicSiteUrl();
    const params = new URLSearchParams();
    if (workspaceId) params.set('ws', workspaceId);
    if (workspace?.name) params.set('name', workspace.name);
    if (workspace?.icon) params.set('icon', workspace.icon);
    if (role) params.set('role', role);
    if (targetEmail) params.set('email', targetEmail);
    const qs = params.toString();
    return `${base}/invite/${code}${qs ? `?${qs}` : ''}`;
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setBatchResult(null);
    setEmailFeedback(null);

    // Multi-email invite
    if (parsedEmails.length > 1) {
      try {
        const res = await batchInviteMembers({
          workspaceId,
          emails: parsedEmails,
          role,
        });

        setEmailInput('');
        setBatchResult(res);

        // If at least one added, set template for the first one as a convenient preview
        if (res.added.length > 0) {
          setActiveTemplate({
            email: res.added[0].email,
            code: res.added[0].inviteCode,
          });

          // If auto direct sending is active, dispatch emails to all added recipients
          if (sendDirectEmail) {
            const codeMap: Record<string, string> = {};
            res.added.forEach((item) => {
              codeMap[item.email.toLowerCase()] = item.inviteCode;
            });
            await sendDirectInviteViaNodemailer(
              res.added.map((item) => item.email),
              codeMap
            );
          }
        }
      } catch (err: any) {
        setInviteError(err.message || 'Failed to send bulk invites.');
      }
      return;
    }

    // Single email or blank link invite
    const singleEmail = parsedEmails[0] || emailInput.trim();
    if (!singleEmail && invites.length > 0) return;

    try {
      const res = await inviteMember({
        workspaceId,
        email: singleEmail || undefined,
        role,
      });

      setEmailInput('');
      if (singleEmail) {
        setActiveTemplate({
          email: singleEmail,
          code: res.invite?.invite_code,
        });

        // Directly send via Nodemailer if toggle is active
        if (sendDirectEmail) {
          const codeMap: Record<string, string> = {};
          if (res.invite?.invite_code) {
            codeMap[singleEmail.toLowerCase()] = res.invite.invite_code;
          }
          await sendDirectInviteViaNodemailer([singleEmail], codeMap);
        }
      } else if (res.invite?.invite_code) {
        handleCopyLink(res.invite.invite_code);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite.');
    }
  };


  const handleCopyLink = (code: string, targetEmail?: string) => {
    const fullUrl = getEnrichedInviteUrl(code, targetEmail);
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleSendEmailApp = (targetEmail: string, code?: string) => {
    const inviteUrl = code ? getEnrichedInviteUrl(code, targetEmail) : undefined;
    const body = buildEmailTemplate(targetEmail, inviteUrl);
    const subject = 'Invitation to explore Synapse';
    const mailto = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleCopyTemplateText = (targetEmail: string, code?: string) => {
    const inviteUrl = code ? getEnrichedInviteUrl(code, targetEmail) : undefined;
    const body = buildEmailTemplate(targetEmail, inviteUrl);
    navigator.clipboard.writeText(body);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  // Selection handlers
  const handleToggleSelectMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
    setIsConfirmingBulkRemove(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedMemberIds.size === nonOwnerMembers.length && nonOwnerMembers.length > 0) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(nonOwnerMembers.map((m) => m.id)));
    }
    setIsConfirmingBulkRemove(false);
  };

  const handleBulkRemoveMembers = async () => {
    if (selectedMemberIds.size === 0) return;
    try {
      const count = selectedMemberIds.size;
      await removeMultipleMembers({
        memberIds: Array.from(selectedMemberIds),
        workspaceId,
      });
      setSelectedMemberIds(new Set());
      setIsConfirmingBulkRemove(false);
      setBulkStatusMsg(`Removed ${count} member${count > 1 ? 's' : ''}`);
      setTimeout(() => setBulkStatusMsg(null), 3000);
    } catch (err: any) {
      setBulkStatusMsg(`Failed to remove members: ${err.message || 'Unknown error'}`);
    }
  };

  const handleBulkUpdateRole = async (newRole: WorkspaceRole) => {
    if (selectedMemberIds.size === 0) return;
    try {
      const count = selectedMemberIds.size;
      await updateMultipleRoles({
        memberIds: Array.from(selectedMemberIds),
        role: newRole,
        workspaceId,
      });
      setBulkStatusMsg(`Updated ${count} member${count > 1 ? 's' : ''} to ${newRole}`);
      setTimeout(() => setBulkStatusMsg(null), 3000);
    } catch (err: any) {
      setBulkStatusMsg(`Failed to update roles: ${err.message || 'Unknown error'}`);
    }
  };

  const latestInvite = invites[invites.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
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
                  Manage Workspace: {workspace?.name || 'Workspace'}
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
                Add multiple members, manage roles, or batch remove members
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
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite & Add</span>
            {parsedEmails.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-full font-bold">
                {parsedEmails.length}
              </span>
            )}
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
            {selectedMemberIds.size > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500 text-white rounded-full font-bold">
                {selectedMemberIds.size}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'invite' ? (
            <>
              {/* Invite by Email(s) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Invite Members
                  </label>
                  {parsedEmails.length > 1 && (
                    <span className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                      <span>⚡ {parsedEmails.length} emails detected (Bulk Add)</span>
                    </span>
                  )}
                </div>

                <form onSubmit={handleInvite} className="space-y-2.5">
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <textarea
                          rows={parsedEmails.length > 1 || emailInput.includes('\n') ? 3 : 1}
                          placeholder="Enter email or multiple emails separated by commas..."
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            if (inviteError) setInviteError(null);
                            if (batchResult) setBatchResult(null);
                            if (emailFeedback) setEmailFeedback(null);
                          }}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y"
                        />
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                          className="px-3 py-2 text-xs font-medium bg-secondary border border-border/60 rounded-xl text-foreground focus:outline-hidden cursor-pointer h-[38px]"
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        <button
                          type="submit"
                          disabled={!emailInput.trim() || isInviting || isSendingEmail}
                          className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap h-[38px] flex items-center gap-1.5"
                        >
                          {isInviting || isSendingEmail ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{isSendingEmail ? 'Sending...' : 'Inviting...'}</span>
                            </>
                          ) : parsedEmails.length > 1 ? (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add {parsedEmails.length} Members</span>
                            </>
                          ) : (
                            'Invite'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Direct Nodemailer auto-send toggle */}
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground/80 hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={sendDirectEmail}
                          onChange={(e) => setSendDirectEmail(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-border/70 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                        />
                        <span>Directly send invite message via Nodemailer</span>
                      </label>
                      <span className="text-[10px] text-indigo-400 font-mono font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Nodemailer SMTP
                      </span>
                    </div>
                  </div>
                </form>

                {/* Email Delivery Feedback Banner */}
                {emailFeedback && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                      emailFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : emailFeedback.type === 'error'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    }`}
                  >
                    {emailFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : emailFeedback.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 leading-relaxed">
                      <div className="font-semibold">{emailFeedback.message}</div>
                      {emailFeedback.details && (
                        <div className="text-[11px] opacity-80 mt-1">{emailFeedback.details}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailFeedback(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Error Banner */}
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

                {/* Batch Invite Result Feedback */}
                {batchResult && (
                  <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          {batchResult.added.length > 0
                            ? `Successfully added ${batchResult.added.length} member${batchResult.added.length > 1 ? 's' : ''}!`
                            : 'No new members added.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBatchResult(null)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {batchResult.added.length > 0 && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSendingEmail}
                          onClick={() => {
                            const codeMap: Record<string, string> = {};
                            batchResult.added.forEach((a) => {
                              codeMap[a.email.toLowerCase()] = a.inviteCode;
                            });
                            sendDirectInviteViaNodemailer(
                              batchResult.added.map((a) => a.email),
                              codeMap
                            );
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending Emails...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send via Nodemailer to All ({batchResult.added.length})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {batchResult.skippedAlreadyMember.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        ℹ️ Skipped {batchResult.skippedAlreadyMember.length} email(s) already in workspace:{' '}
                        <span className="font-mono text-foreground/80">
                          {batchResult.skippedAlreadyMember.join(', ')}
                        </span>
                      </div>
                    )}

                    {batchResult.skippedAlreadyInvited.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        ℹ️ Skipped {batchResult.skippedAlreadyInvited.length} email(s) with active invites:{' '}
                        <span className="font-mono text-foreground/80">
                          {batchResult.skippedAlreadyInvited.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground mt-2">
                  Tip: Paste a list of emails (comma, space, or newline separated) to add multiple members at once.
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

                  <div className="p-3 bg-secondary/80 border border-border/60 rounded-xl text-xs font-sans text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto select-all">
                    {buildEmailTemplate(
                      activeTemplate.email,
                      activeTemplate.code
                        ? getPublicSiteUrl(`/invite/${activeTemplate.code}`)
                        : undefined
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Primary Direct Nodemailer Button */}
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={() => {
                        const codeMap = activeTemplate.code
                          ? { [activeTemplate.email.toLowerCase()]: activeTemplate.code }
                          : undefined;
                        sendDirectInviteViaNodemailer([activeTemplate.email], codeMap);
                      }}
                      className="flex-1 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending via Nodemailer...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send via Nodemailer</span>
                        </>
                      )}
                    </button>

                    {/* Mailto link fallback */}
                    <button
                      type="button"
                      onClick={() => handleSendEmailApp(activeTemplate.email, activeTemplate.code)}
                      className="py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Open in default email app (Apple Mail, Outlook, etc.)"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Default App</span>
                    </button>

                    {/* Copy text fallback */}
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
                          <span>Copy</span>
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
                      ? getEnrichedInviteUrl(latestInvite.invite_code, latestInvite.email)
                      : 'Generate an invite link to share with your team'}
                  </div>

                  {latestInvite ? (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(latestInvite.invite_code, latestInvite.email)}
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
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Active Invite Links ({invites.length})
                    </div>
                    <button
                      type="button"
                      disabled={isClearingInvites}
                      onClick={async () => {
                        if (confirm('Clear all active invite links for this workspace?')) {
                          await clearWorkspaceInvites({ workspaceId });
                        }
                      }}
                      className="text-[11px] text-rose-400/90 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Clear all active invite rows for this workspace"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                            <>
                              <button
                                type="button"
                                disabled={isSendingEmail}
                                onClick={() => {
                                  sendDirectInviteViaNodemailer([inv.email!], {
                                    [inv.email!.toLowerCase()]: inv.invite_code,
                                  });
                                }}
                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Send invite email directly via Nodemailer"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveTemplate({
                                    email: inv.email!,
                                    code: inv.invite_code,
                                  })
                                }
                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                title="View template or send via default email app"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.invite_code, inv.email)}
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
            /* Members List Tab with Batch Actions */
            <div className="space-y-3.5">
              {/* Search & Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {nonOwnerMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded"
                      title={
                        selectedMemberIds.size === nonOwnerMembers.length
                          ? 'Deselect all'
                          : 'Select all non-owners'
                      }
                    >
                      {selectedMemberIds.size === nonOwnerMembers.length && nonOwnerMembers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : selectedMemberIds.size > 0 ? (
                        <MinusSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Current Members ({members.length})
                  </span>
                </div>

                {/* Member search */}
                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500"
                  />
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => setMemberSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {bulkStatusMsg && (
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between animate-in fade-in">
                  <span>{bulkStatusMsg}</span>
                  <button
                    type="button"
                    onClick={() => setBulkStatusMsg(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Sticky / Active Bulk Actions Bar */}
              {selectedMemberIds.size > 0 && (
                <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-150 shadow-md shadow-indigo-500/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-200">
                      {selectedMemberIds.size} {selectedMemberIds.size === 1 ? 'member' : 'members'} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemberIds(new Set());
                        setIsConfirmingBulkRemove(false);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bulk Role Change */}
                    <div className="flex items-center gap-1.5">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkUpdateRole(e.target.value as WorkspaceRole);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        disabled={isUpdatingBulkRoles}
                        className="px-2 py-1 text-xs bg-card border border-border/70 rounded-lg text-foreground cursor-pointer focus:outline-hidden"
                      >
                        <option value="" disabled>Change role...</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>

                    {/* Bulk Remove Button with inline confirmation */}
                    {isConfirmingBulkRemove ? (
                      <div className="flex items-center gap-1.5 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/40">
                        <span className="text-[11px] font-bold text-rose-300">Remove all?</span>
                        <button
                          type="button"
                          disabled={isRemovingBulk}
                          onClick={handleBulkRemoveMembers}
                          className="px-2 py-0.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors cursor-pointer"
                        >
                          {isRemovingBulk ? 'Removing...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingBulkRemove(false)}
                          className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingBulkRemove(true)}
                        className="px-3 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Remove ({selectedMemberIds.size})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No members match your filter.
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isOwner = member.role === 'owner';
                    const isSelected = selectedMemberIds.has(member.id);
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
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-xs'
                            : 'bg-secondary/30 border-border/40 hover:border-border/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selection Checkbox for Non-Owners */}
                          {!isOwner ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSelectMember(member.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-4 h-4 flex items-center justify-center shrink-0" title="Workspace Owner cannot be removed">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                          )}

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
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {activeTab === 'members' && selectedMemberIds.size > 0 ? (
              <span>{selectedMemberIds.size} of {nonOwnerMembers.length} non-owners selected</span>
            ) : (
              <span>Workspace ID: <code className="text-foreground/80">{workspaceId}</code></span>
            )}
          </div>
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

