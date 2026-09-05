'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database } from '@/types/domain';
import { localDb } from '@/lib/dexie/db';
import { GoogleSheetSyncModal } from './GoogleSheetSyncModal';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Unlink,
  Loader2,
} from 'lucide-react';

interface Props {
  database: Database;
  workspaceId: string;
  onRefreshDatabase?: () => void;
}

interface GoogleSheetLink {
  id: string;
  google_spreadsheet_id: string;
  google_sheet_title: string;
  google_sheet_url?: string;
  status: 'synced' | 'syncing' | 'conflict' | 'error';
  last_synced_at: string;
}

export const GoogleSheetSyncBadge: React.FC<Props> = ({
  database,
  workspaceId,
  onRefreshDatabase,
}) => {
  const [link, setLink] = useState<GoogleSheetLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLinkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/google/sheets/sync?databaseId=${database.id}`);
      const data = await res.json();
      if (res.ok && data.linked) {
        setLink(data.link);
      } else {
        setLink(null);
      }
    } catch (err) {
      console.error('Failed to load Google Sheet link status:', err);
    } finally {
      setLoading(false);
    }
  }, [database.id]);

  useEffect(() => {
    fetchLinkStatus();
  }, [fetchLinkStatus]);

  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const localDatabase = await localDb.databases.get(database.id);

      const res = await fetch('/api/integrations/google/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          databaseId: database.id,
          clientDatabase: localDatabase || database,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.updatedRows && data.updatedRows.length > 0) {
          const localRecord = await localDb.databases.get(database.id);
          if (localRecord) {
            await localDb.databases.update(database.id, {
              rows: data.updatedRows,
              updated_at: new Date().toISOString(),
            });
          }
          if (onRefreshDatabase) onRefreshDatabase();
        }
        await fetchLinkStatus();
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink this database from Google Sheets? The Google Sheet will be preserved.')) {
      return;
    }
    try {
      await fetch('/api/integrations/google/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlink',
          databaseId: database.id,
        }),
      });
      setLink(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-7 w-28 bg-secondary/50 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {!link ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Sync Google Sheet</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-card/60 border border-border/70 backdrop-blur-md rounded-xl p-0.5 shadow-sm">
          {/* Status Badge */}
          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            title={`Linked to "${link.google_sheet_title}". Click to Sync Now.`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-secondary/60 text-xs font-medium text-foreground transition-all cursor-pointer"
          >
            {isSyncing ? (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span className="font-semibold text-emerald-400">
              {isSyncing ? 'Syncing...' : 'Sheets Synced'}
            </span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            title="Force two-way sync"
            className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* External Link */}
          {link.google_spreadsheet_id && (
            <a
              href={
                link.google_sheet_url ||
                `https://docs.google.com/spreadsheets/d/${link.google_spreadsheet_id}/edit`
              }
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Google Sheets"
              className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Unlink Button */}
          <button
            type="button"
            onClick={handleUnlink}
            title="Unlink Google Sheet"
            className="p-1 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Unlink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        database={database}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchLinkStatus();
          if (onRefreshDatabase) onRefreshDatabase();
        }}
      />
    </div>
  );
};
