'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Note, Block, Whiteboard, Database } from '@/types/domain';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { WhiteboardCanvas } from '@/components/canvas/WhiteboardCanvas';
import { TableView } from '@/components/database/TableView';
import { BoardView } from '@/components/database/BoardView';
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Loader2,
  Table,
  Kanban,
  AlertCircle,
  Eye,
  User,
  RefreshCw,
} from 'lucide-react';

export default function SharedResourcePage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = use(params);
  const { user, loading: authLoading, loginLocal } = useAuth();

  const [loadingResource, setLoadingResource] = useState(true);
  const [resource, setResource] = useState<any | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [publisherName, setPublisherName] = useState<string>('');
  const [publishedAt, setPublishedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dbView, setDbView] = useState<'table' | 'board'>('table');

  const normalizedType = type.toLowerCase();
  const shareRedirectPath = `/share/${normalizedType}/${id}`;

  // Fetch from the server-side share API — NOT from local IndexedDB
  useEffect(() => {
    if (!user) return; // Wait until auth is resolved

    async function fetchSharedContent() {
      try {
        setLoadingResource(true);
        setError(null);

        const res = await fetch(`/api/share?type=${encodeURIComponent(normalizedType)}&id=${encodeURIComponent(id)}`);

        if (res.status === 404) {
          setError(
            'This shared document is not available. The owner needs to open it and click "Share" again to publish the latest version.'
          );
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load the shared document.');
          return;
        }

        const data = await res.json();
        const snapshot = data.snapshot;

        setResource(snapshot.resource);
        setBlocks(snapshot.blocks || []);
        setPublisherName(snapshot.publisherName || '');
        setPublishedAt(snapshot.publishedAt || '');
      } catch (err: any) {
        setError(err.message || 'Network error — failed to load shared document.');
      } finally {
        setLoadingResource(false);
      }
    }

    fetchSharedContent();
  }, [normalizedType, id, user]);

  // ── 1. Auth loading ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-xs text-muted-foreground mt-3">Checking credentials…</p>
      </div>
    );
  }

  // ── 2. Auth Gate — not logged in ─────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-indigo-500/20">
            🧠
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Synapse</span>
        </Link>

        {/* Gate card */}
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-7 shadow-2xl z-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3 h-3" />
              <span>Authentication Required</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">
              Sign in to view this {normalizedType}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Someone shared a document with you. You must have a Synapse account to view it.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <Link
              href={`/login?redirect=${encodeURIComponent(shareRedirectPath)}`}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Log In to View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href={`/signup?redirect=${encodeURIComponent(shareRedirectPath)}`}
              className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border/60 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Sign Up for Free</span>
            </Link>

            <button
              type="button"
              onClick={() => loginLocal('Guest Collaborator', 'guest@synapse.local')}
              className="w-full py-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Continue as Guest</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-xs text-muted-foreground z-10">
          Privacy-respecting • Local-first • Developer-friendly
        </div>
      </div>
    );
  }

  // ── 3. Loading content ───────────────────────────────────────────────────
  if (loadingResource) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-xs text-muted-foreground mt-3">Loading shared document…</p>
      </div>
    );
  }

  // ── 4. Error / Not published ─────────────────────────────────────────────
  if (error || !resource) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-1">Document Not Available</h1>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          {error ||
            'This shared document is not published yet. The owner needs to open it and click the Share button.'}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors border border-border/60"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <span>Go to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ── 5. Render shared document ─────────────────────────────────────────────
  const workspaceId = resource.workspace_id || 'ws-default-synapse';
  const openInAppPath =
    normalizedType === 'canvas'
      ? `/${workspaceId}/canvas/${resource.id}`
      : normalizedType === 'database'
      ? `/${workspaceId}/databases`
      : `/${workspaceId}/notes/${resource.id}`;

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      {/* Top viewer bar */}
      <header className="h-13 px-4 border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/${workspaceId}/notes`} className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-xs">
              🧠
            </div>
            <span className="text-xs font-bold tracking-tight text-foreground hidden sm:inline">
              Synapse
            </span>
          </Link>

          <div className="h-4 w-px bg-border/80 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{resource.icon || '📄'}</span>
            <span className="text-xs font-bold text-foreground truncate max-w-[160px] sm:max-w-md">
              {resource.title || 'Untitled'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider shrink-0 hidden md:inline-flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" /> Shared View
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Database view toggle */}
          {normalizedType === 'database' && (
            <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border/80">
              <button
                type="button"
                onClick={() => setDbView('table')}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  dbView === 'table' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Table className="w-3 h-3" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setDbView('board')}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  dbView === 'board' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Kanban className="w-3 h-3" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>
          )}

          {/* Publisher + viewer info */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-secondary/50 rounded-lg text-[11px] text-muted-foreground border border-border/40">
            <User className="w-3 h-3 text-indigo-400" />
            <span>
              Shared by <strong className="text-foreground">{publisherName || 'Synapse User'}</strong>
            </span>
          </div>

          <Link
            href={openInAppPath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all"
          >
            <span className="hidden sm:inline">Open in Workspace</span>
            <span className="sm:hidden">Open</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Document body — READ-ONLY */}
      <main className="flex-1 w-full relative overflow-y-auto">
        {normalizedType === 'note' && (
          <div className="w-full">
            <BlockEditor note={resource as Note} initialBlocks={blocks} />
          </div>
        )}

        {normalizedType === 'canvas' && (
          <div className="w-full h-[calc(100vh-3.25rem)] overflow-hidden">
            <WhiteboardCanvas
              whiteboard={resource as Whiteboard}
              workspaceId={workspaceId}
            />
          </div>
        )}

        {normalizedType === 'database' && (
          <div className="w-full max-w-6xl mx-auto px-6 py-8">
            {dbView === 'table' ? (
              <TableView database={resource as Database} />
            ) : (
              <BoardView database={resource as Database} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
