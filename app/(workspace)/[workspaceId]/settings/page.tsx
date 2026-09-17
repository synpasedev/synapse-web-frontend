'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Settings,
  Database,
  Cloud,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  Users,
  UserPlus,
  Mail,
  Clock,
  XCircle,
  Shield,
  Crown,
} from 'lucide-react';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ThemeSettingsSection } from '@/components/theme/ThemeSettingsSection';
import { useWorkspace, useWorkspaceMembers, useWorkspaceInvites } from '@/hooks/use-workspace';
import { useUIStore } from '@/stores/use-ui-store';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId);
  const { setInviteModalOpen } = useUIStore();

  const [noteCount, setNoteCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingInvites = invites.filter(
    (i) => i.status === 'pending' && (!i.expires_at || new Date(i.expires_at) > new Date())
  );
  const acceptedInvites = invites.filter((i) => i.status === 'accepted' || i.status === 'consumed');
  const rejectedInvites = invites.filter((i) => i.status === 'rejected');

  useEffect(() => {
    async function loadStats() {
      const n = await localDb.notes.count();
      const b = await localDb.blocks.count();
      const l = await localDb.links.count();
      setNoteCount(n);
      setBlockCount(b);
      setLinkCount(l);
    }
    loadStats();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncEngine.flush();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pt-16 sm:pt-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Workspace Settings & Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage team collaboration, appearance themes, local-first storage, and cloud sync
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Team & Collaboration Section */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">Team Collaboration & Members</h2>
                  {workspace?.type === 'shared' ? (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      Shared Workspace
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                      Private
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time notes collaboration, role permissions, and member invite tracking
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Manage & Invite</span>
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Collaborators</span>
                <Users className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{members.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Active in workspace</div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{pendingInvites.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting response</div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">Accepted</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{acceptedInvites.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Joined via invite</div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-400">Declined</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{rejectedInvites.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Declined invitations</div>
            </div>
          </div>

          {/* Members List Preview */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
              Active Workspace Collaborators
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((member) => {
                const isOwner = member.role === 'owner';
                const name = member.name || member.email?.split('@')[0] || 'Member';
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          isOwner
                            ? 'bg-amber-500'
                            : member.role === 'admin'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                          <span>{name}</span>
                          {isOwner && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{member.email}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        isOwner
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : member.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-secondary text-muted-foreground border-border/50'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Appearance & Themes Section */}
        <ThemeSettingsSection />

        {/* Local Storage Engine */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-foreground">Local-First IndexedDB Status</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Operational
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            All workspace notes, blocks, and bidirectional graph links are committed locally via Dexie.js with zero network latency.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-center">
              <div className="text-xl font-bold text-foreground">{noteCount}</div>
              <div className="text-[11px] text-muted-foreground uppercase font-semibold mt-0.5">Notes</div>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-center">
              <div className="text-xl font-bold text-foreground">{blockCount}</div>
              <div className="text-[11px] text-muted-foreground uppercase font-semibold mt-0.5">Blocks</div>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 text-center">
              <div className="text-xl font-bold text-foreground">{linkCount}</div>
              <div className="text-[11px] text-muted-foreground uppercase font-semibold mt-0.5">Graph Links</div>
            </div>
          </div>
        </div>

        {/* Supabase Cloud Sync */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-foreground">Cloud Sync (Supabase PostgreSQL)</h2>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground border border-border/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Connect your Supabase project in <code className="text-indigo-300 bg-secondary px-1.5 py-0.5 rounded font-mono">.env.local</code> to enable background synchronization and real-time multiplayer backups.
          </p>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground font-mono space-y-1">
            <div>BACKEND = Supabase PostgreSQL (Cloud Sync) + Dexie.js (Local IndexedDB)</div>
            <div>STATUS = Monotonic Queue Ready (Last-Write-Wins LWW)</div>
          </div>
        </div>

        {/* AI Provider Config */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-foreground">AI Assistant Engine (Google Gemini)</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Synapse is powered by <strong>Google Gemini (1.5 Flash / 2.0 Flash)</strong> for note summarization, writing improvements, action items extraction, and freeform queries. You can get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a> with no credit card required.
          </p>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground space-y-1 font-mono">
            <div>PROVIDER = Google Gemini (1.5 Flash / 2.0 Flash)</div>
            <div>ENV_VAR = GEMINI_API_KEY (or GOOGLE_API_KEY)</div>
            <div>ENDPOINTS = /api/ai/summarize, /api/ai/improve, /api/ai/action-items, /api/ai/expand, /api/ai/chat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
