'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAcceptInvite } from '@/hooks/use-workspace';
import { localDb } from '@/lib/dexie/db';
import { Workspace, WorkspaceInvite, WorkspaceRole } from '@/types/domain';
import { ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

function InviteContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = (params?.code as string) || '';

  const paramWs = searchParams?.get('ws') || '';
  const paramName = searchParams?.get('name') || '';
  const paramIcon = searchParams?.get('icon') || '';
  const paramRole = (searchParams?.get('role') as WorkspaceRole) || 'editor';
  const paramEmail = searchParams?.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const { mutateAsync: acceptInvite, isPending: isJoining } = useAcceptInvite();

  useEffect(() => {
    async function loadInvite() {
      if (!code) return;
      try {
        setLoading(true);
        setError(null);
        const cleanCode = code.trim().toLowerCase();

        // 1. If enriched query parameters exist in URL, hydrate immediately
        if (paramWs || paramName) {
          const now = new Date().toISOString();
          const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          const recoveredInvite: WorkspaceInvite = {
            id: `inv-${cleanCode.replace(/^syn-/, '')}`,
            workspace_id: paramWs || 'ws-default-synapse',
            email: paramEmail || undefined,
            role: paramRole,
            invite_code: cleanCode,
            created_by: 'system',
            created_at: now,
            expires_at: oneWeekLater,
            status: 'pending',
          };

          const recoveredWorkspace: Workspace = {
            id: paramWs || 'ws-default-synapse',
            name: paramName || 'Collaborative Workspace',
            slug: (paramName || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            icon: paramIcon || '👥',
            owner_id: 'system',
            type: 'shared',
            role: paramRole,
            created_at: now,
            updated_at: now,
          };

          // Cache locally in Dexie
          await localDb.transaction('rw', [localDb.workspace_invites, localDb.workspaces], async () => {
            await localDb.workspace_invites.put(recoveredInvite);
            await localDb.workspaces.put(recoveredWorkspace);
          });

          // Sync to server API in the background
          fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invite: {
                ...recoveredInvite,
                workspace_name: recoveredWorkspace.name,
                workspace_icon: recoveredWorkspace.icon,
                workspace_slug: recoveredWorkspace.slug,
              },
            }),
          }).catch(() => {});

          setInvite(recoveredInvite);
          setWorkspace(recoveredWorkspace);
          if (paramEmail) setEmail(paramEmail);
          setLoading(false);
          return;
        }

        // 2. Check local Dexie IndexedDB
        const allInvites = await localDb.workspace_invites.toArray();
        let found = allInvites.find(
          (i) => i.invite_code && i.invite_code.toLowerCase() === cleanCode
        );

        let ws: Workspace | null = null;
        if (found) {
          ws = (await localDb.workspaces.get(found.workspace_id)) || null;
        }

        // 3. If not found in IndexedDB or workspace missing, query central server API
        if (!found || !ws) {
          try {
            const res = await fetch(`/api/invite/${encodeURIComponent(cleanCode)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.invite) {
                found = data.invite;

                // Sync invite to local Dexie
                await localDb.workspace_invites.put(found!);

                // Sync workspace to local Dexie
                const wsData = data.workspace;
                const now = new Date().toISOString();
                const fetchedWs: Workspace = {
                  id: wsData?.id || found!.workspace_id,
                  name: wsData?.name || 'Workspace',
                  slug: (wsData?.name || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  icon: wsData?.icon || '👥',
                  owner_id: found!.created_by || 'system',
                  type: 'shared',
                  role: found!.role || 'editor',
                  created_at: now,
                  updated_at: now,
                };
                ws = fetchedWs;
                await localDb.workspaces.put(fetchedWs);
              }
            } else {
              const errJson = await res.json().catch(() => ({}));
              if (!found) {
                setError(errJson.error || 'Invitation link is invalid or has expired.');
                return;
              }
            }
          } catch (networkErr) {
            console.warn('[InvitePage] Server fetch fallback error:', networkErr);
          }
        }

        if (found) {
          setInvite(found);
          if (ws) setWorkspace(ws);
          if (found.email) setEmail(found.email);
        } else {
          setError('Invitation link is invalid or has expired.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [code, paramWs, paramName, paramIcon, paramRole, paramEmail]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const userEmail = email.trim() || paramEmail || 'collaborator@synapse.local';
      const userName = name.trim() || 'New Collaborator';

      // Persist user preference for local profile
      try {
        localStorage.setItem('synapse_current_user_email', userEmail);
        localStorage.setItem('synapse_current_user_name', userName);
      } catch {}

      const result = await acceptInvite({
        code,
        userEmail,
        userName,
      });

      setJoined(true);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        router.push(`/${result.workspaceId}/notes`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Could not join workspace.');
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Checking invitation link...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Invitation Not Found</h1>
        <p className="text-xs text-muted-foreground">{error}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <span>Go to Synapse</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Welcome to the Team!</h1>
        <p className="text-xs text-muted-foreground">
          You've successfully joined <strong>{workspace?.name}</strong>. Redirecting to workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-indigo-500/20">
          {workspace?.icon || '👥'}
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Join {workspace?.name || 'Workspace'}
        </h1>
        <p className="text-xs text-muted-foreground">
          You've been invited to collaborate as an{' '}
          <span className="font-semibold text-indigo-400 uppercase tracking-wider">
            {invite?.role || paramRole || 'editor'}
          </span>
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
            Your Email
          </label>
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
            Your Name (Optional)
          </label>
          <input
            type="text"
            placeholder="Alex Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {error && (
          <div className="p-2.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isJoining}
          className="w-full py-2.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Joining Workspace...</span>
            </>
          ) : (
            <>
              <span>Accept Invite & Join Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-border/40 text-center">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Return to home
        </Link>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
