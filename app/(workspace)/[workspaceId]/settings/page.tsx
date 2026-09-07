'use client';

import React, { useState, useEffect, use } from 'react';
import { Settings, Database, Cloud, Sparkles, RefreshCw, CheckCircle2, ShieldCheck, HardDrive } from 'lucide-react';
import { localDb } from '@/lib/dexie/db';
import { syncEngine } from '@/lib/dexie/sync-engine';
import { ThemeSettingsSection } from '@/components/theme/ThemeSettingsSection';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [noteCount, setNoteCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

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
            Manage appearance themes, local-first IndexedDB storage, and sync
          </p>
        </div>
      </div>

      <div className="space-y-6">
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
            <div>NEXT_PUBLIC_SUPABASE_URL = {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not connected (Local Mode)'}</div>
            <div>STATUS = Monotonic Queue Ready (Last-Write-Wins LWW)</div>
          </div>
        </div>

        {/* AI Provider Config */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-foreground">AI Assistant Engine</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Synapse supports local Ollama endpoints (100% private at $0) and ultra-fast cloud LLMs like Groq.
          </p>

          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 text-xs text-muted-foreground space-y-1 font-mono">
            <div>PROVIDER = {process.env.AI_PROVIDER || 'Groq Cloud / Local Fallback Engine'}</div>
            <div>ENDPOINT = /api/ai/summarize, /api/ai/expand, /api/ai/generate-template</div>
          </div>
        </div>
      </div>
    </div>
  );
}
