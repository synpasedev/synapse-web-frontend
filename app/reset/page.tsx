'use client';

import React, { useEffect, useState } from 'react';
import { localDb } from '@/lib/dexie/db';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ClearDbPage() {
  const [status, setStatus] = useState<'clearing' | 'success' | 'error'>('clearing');
  const [message, setMessage] = useState('Clearing all local and online database stores...');

  useEffect(() => {
    async function clearAll() {
      try {
        // 1. Clear IndexedDB tables
        try {
          await localDb.notes.clear();
          await localDb.blocks.clear();
          await localDb.links.clear();
          await localDb.templates.clear();
          await localDb.databases.clear();
          await localDb.whiteboards.clear();
          await localDb.workspace_invites.clear();
          await localDb.workspace_members.clear();
          await localDb.workspaces.clear();
          await localDb.sync_queue.clear();
          await localDb.delete();
        } catch (e) {
          console.warn('IndexedDB clear warning:', e);
        }

        // 2. Clear all local/session storage
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
          } catch (e) {}
        }

        // 3. Clear server disk store & online Supabase database
        const res = await fetch('/api/system/reset-db', { method: 'POST' });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Server reset failed');
        }

        setStatus('success');
        setMessage('All databases (local IndexedDB, localStorage, server store, and Supabase) have been completely cleared. Redirecting to fresh workspace in 2 seconds...');

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (err: any) {
        console.error('Failed to clear database:', err);
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred while clearing database.');
      }
    }

    clearAll();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="p-6 sm:p-8 max-w-md w-full bg-card border border-border/80 rounded-2xl shadow-2xl text-center space-y-4">
        {status === 'clearing' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <h1 className="text-base font-bold text-foreground">Clearing Databases</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <h1 className="text-base font-bold text-foreground">Database Cleared</h1>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <h1 className="text-base font-bold text-foreground">Reset Error</h1>
          </div>
        )}

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
