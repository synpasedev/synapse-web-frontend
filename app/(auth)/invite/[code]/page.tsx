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

  const paramEmail = searchParams?.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');
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

        // 1. Authoritative Server Verification (Eliminates privilege escalation and revocation bypass)
        const res = await fetch(`/api/invite/${encodeURIComponent(cleanCode)}`);
        
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errorMsg =
            errJson.error ||
            (errJson.consumed
              ? 'This invitation has already been accepted and cannot be reused.'
              : errJson.revoked
              ? 'This invitation has been revoked by the workspace owner.'
              : errJson.expired
              ? 'This invitation link has expired.'
              : errJson.deleted
              ? 'This workspace has been deleted by its owner.'
              : 'Invitation link is invalid or has expired.');
          setError(errorMsg);
          return;
        }

        const data = await res.json();
        const serverInvite: WorkspaceInvite = data.invite;
        const serverWorkspace: Workspace = data.workspace;

        if (!serverInvite || !serverWorkspace) {
          setError('Invitation link is invalid or has expired.');
          return;
        }

        // 2. Enforce status verification
        if (serverInvite.status === 'consumed') {
          setError('This invitation has already been accepted and cannot be reused.');
          return;
        }
        if (serverInvite.status === 'revoked') {
          setError('This invitation has been revoked by the workspace owner.');
          return;
        }
        if (serverInvite.expires_at && new Date(serverInvite.expires_at) < new Date()) {
          setError('This invitation link has expired.');
          return;
        }

        // 3. Cache verified invite and workspace in local Dexie
        await localDb.transaction('rw', [localDb.workspace_invites, localDb.workspaces], async () => {
          await localDb.workspace_invites.put(serverInvite);
          await localDb.workspaces.put(serverWorkspace);
        });

        setInvite(serverInvite);
        setWorkspace(serverWorkspace);

        // Pre-fill email from invite, local storage, or query parameter
        const storedEmail =
          typeof window !== 'undefined'
            ? localStorage.getItem('synapse_current_user_email') || ''
            : '';
        const storedName =
          typeof window !== 'undefined'
            ? localStorage.getItem('synapse_current_user_name') || ''
            : '';

        if (storedEmail && storedEmail !== 'user@synapse.local' && storedEmail !== 'guest@synapse.local') {
          setLoggedInEmail(storedEmail);
        }

        if (serverInvite.email) {
          setEmail(serverInvite.email);
        } else if (storedEmail && storedEmail !== 'user@synapse.local' && storedEmail !== 'guest@synapse.local') {
          setEmail(storedEmail);
        } else if (paramEmail) {
          setEmail(paramEmail);
        }

        if (storedName && storedName !== 'Workspace Owner') {
          setName(storedName);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [code, paramEmail]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const userEmail = email.trim() || paramEmail || 'collaborator@synapse.local';
      const userName = name.trim() || 'New Collaborator';

      // Safe session persistence: Only overwrite if no active session or matching (EC-3.2)
      try {
        const currentStored = localStorage.getItem('synapse_current_user_email');
        if (
          !currentStored ||
          currentStored === 'user@synapse.local' ||
          currentStored === 'guest@synapse.local' ||
          currentStored.toLowerCase() === userEmail.toLowerCase()
        ) {
          localStorage.setItem('synapse_current_user_email', userEmail);
          localStorage.setItem('synapse_current_user_name', userName);
        }
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
            {invite?.role || 'editor'}
          </span>
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Your Email
            </label>
            {invite?.email && (
              <span className="text-[10px] text-muted-foreground">
                (Designated recipient)
              </span>
            )}
          </div>
          <input
            type="email"
            required
            readOnly={Boolean(invite?.email)}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 text-xs bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
              invite?.email ? 'opacity-80 cursor-not-allowed bg-secondary/30' : ''
            }`}
          />
          {invite?.email && loggedInEmail && loggedInEmail.toLowerCase() !== invite.email.toLowerCase() && (
            <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                You are signed in as <strong>{loggedInEmail}</strong>. Joining will add <strong>{invite.email}</strong> to this workspace.
              </span>
            </div>
          )}
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
