'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Unlink,
  Loader2,
} from 'lucide-react';
import { GoogleDocSyncModal } from './GoogleDocSyncModal';
import { localDb } from '@/lib/dexie/db';

interface GoogleDocLink {
  id: string;
  google_doc_id: string;
  google_doc_title: string;
  status: 'synced' | 'syncing' | 'conflict' | 'error' | 'paused';
  last_synced_at: string;
  error_message?: string;
}

interface Props {
  noteId: string;
  workspaceId: string;
  noteTitle: string;
  link?: GoogleDocLink | null;
  isSyncing?: boolean;
  onForceSync?: () => Promise<void> | void;
  onRefreshLink?: () => Promise<any> | void;
}

export const GoogleDocSyncBadge: React.FC<Props> = ({
  noteId,
  workspaceId,
  noteTitle,
  link: controlledLink,
  isSyncing: controlledIsSyncing,
  onForceSync,
  onRefreshLink,
}) => {
  const [internalLink, setInternalLink] = useState<GoogleDocLink | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalSyncing, setInternalSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isControlled = controlledLink !== undefined;
  const link = isControlled ? controlledLink : internalLink;
  const isSyncing = isControlled ? Boolean(controlledIsSyncing) : internalSyncing;

  const fetchLinkStatus = useCallback(async () => {
    if (isControlled && onRefreshLink) {
      await onRefreshLink();
      setInternalLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/integrations/google/sync?noteId=${noteId}`);
      const data = await res.json();
      if (res.ok && data.linked) {
        setInternalLink(data.link);
      } else {
        setInternalLink(null);
      }
    } catch (err) {
      console.error('Failed to load Google Doc link status:', err);
    } finally {
      setInternalLoading(false);
    }
  }, [noteId, isControlled, onRefreshLink]);

  useEffect(() => {
    if (!isControlled) {
      fetchLinkStatus();
    } else {
      setInternalLoading(false);
    }
  }, [fetchLinkStatus, isControlled]);

  const handleForceSync = async () => {
    if (isSyncing) return;
    if (onForceSync) {
      await onForceSync();
      return;
    }
    setInternalSyncing(true);
    try {
      const localNote = await localDb.notes.get(noteId);
      const localBlocks = await localDb.blocks.where('note_id').equals(noteId).sortBy('sort_order');

      const res = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          noteId,
          clientNote: localNote,
          clientBlocks: localBlocks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.updatedBlocks && data.updatedTitle) {
          await localDb.notes.update(noteId, { title: data.updatedTitle, updated_at: new Date().toISOString() });
          await localDb.blocks.where('note_id').equals(noteId).delete();
          for (const b of data.updatedBlocks) {
            await localDb.blocks.put({
              id: b.id || crypto.randomUUID(),
              note_id: noteId,
              workspace_id: workspaceId,
              parent_block_id: null,
              type: b.type || 'paragraph',
              content: b.content || { text: '' },
              properties: b.properties || {},
              sort_order: b.sort_order || 1000,
              created_by: 'local-user',
              updated_by: 'local-user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: 1,
            });
          }
        }
        await fetchLinkStatus();
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInternalSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink this note from Google Docs? Both documents will be preserved independently.')) {
      return;
    }
    try {
      await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', noteId }),
      });
      if (onRefreshLink) {
        await onRefreshLink();
      } else {
        setInternalLink(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isControlled && internalLoading) {
    return null;
  }

  const googleDocUrl = link
    ? `https://docs.google.com/document/d/${link.google_doc_id}/edit`
    : '';

  return (
    <>
      {link ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-secondary/30 backdrop-blur-md text-xs">
          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />

          {isSyncing || link.status === 'syncing' ? (
            <span className="flex items-center gap-1 text-indigo-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Syncing</span>
            </span>
          ) : link.status === 'conflict' ? (
            <span className="flex items-center gap-1 text-amber-400" title={link.error_message}>
              <AlertTriangle className="w-3 h-3" />
              <span>Conflict</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Docs Synced</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Sync changes now"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <a
            href={googleDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-blue-400 transition-colors cursor-pointer"
            title="Open in Google Docs"
          >
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={handleUnlink}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Unlink from Google Docs"
          >
            <Unlink className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 hover:border-blue-500/40 bg-secondary/20 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-300 text-xs transition-all cursor-pointer"
          title="Link to Google Docs"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Sync Google Doc</span>
        </button>
      )}

      <GoogleDocSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        noteId={noteId}
        workspaceId={workspaceId}
        noteTitle={noteTitle}
        onSuccess={() => {
          fetchLinkStatus();
        }}
      />
    </>
  );
};
