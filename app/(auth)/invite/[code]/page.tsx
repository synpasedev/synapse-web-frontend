'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAcceptInvite } from '@/hooks/use-workspace';
import { localDb } from '@/lib/dexie/db';
import { Workspace, WorkspaceInvite } from '@/types/domain';
import { Users, ArrowRight, Shield, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || '';

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
        // Find invite by code
        const allInvites = await localDb.workspace_invites.toArray();
        const found = allInvites.find(
          (i) => i.invite_code.toLowerCase() === code.trim().toLowerCase()
        );

        if (found) {
          setInvite(found);
          const ws = await localDb.workspaces.get(found.workspace_id);
          setWorkspace(ws || null);
          if (found.email) {
            setEmail(found.email);
          }
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
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const userEmail = email.trim() || 'collaborator@synapse.local';
      const userName = name.trim() || 'New Collaborator';

      const result = await acceptInvite({
        code,
        userEmail,
        userName,
      });

      setJoined(true);
      confetti({
        particleCount: 50,
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
          <span>{isJoining ? 'Joining...' : 'Accept Invite & Join Workspace'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
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
