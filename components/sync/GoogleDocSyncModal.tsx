'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Link as LinkIcon,
  Search,
  Loader2,
  X,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { localDb } from '@/lib/dexie/db';

interface GoogleDocItem {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  workspaceId: string;
  noteTitle: string;
  onSuccess: (googleDocUrl: string) => void;
}

export const GoogleDocSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  noteId,
  workspaceId,
  noteTitle,
  onSuccess,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [docs, setDocs] = useState<GoogleDocItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check integration connection status
    fetch('/api/integrations/google/status')
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected);
        setGoogleEmail(data.email);
        if (data.connected) {
          fetchDocs('');
        }
      })
      .catch((err) => {
        console.error(err);
        setIsConnected(false);
      });
  }, [isOpen]);

  const fetchDocs = async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/google/docs/list?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setDocs(data.docs || []);
      } else {
        setError(data.error || 'Failed to fetch Google Docs');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDoc = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const localNote = await localDb.notes.get(noteId);
      const localBlocks = await localDb.blocks.where('note_id').equals(noteId).sortBy('sort_order');

      const res = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          noteId,
          workspaceId,
          clientNote: localNote || { title: noteTitle },
          clientBlocks: localBlocks || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Google Doc');
      onSuccess(data.googleDocUrl);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkDoc = async (googleDocId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          noteId,
          workspaceId,
          googleDocId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link Google Doc');

      // Update local Dexie database if blocks returned
      if (data.blocks && data.noteTitle) {
        await localDb.notes.update(noteId, { title: data.noteTitle, updated_at: new Date().toISOString() });
        await localDb.blocks.where('note_id').equals(noteId).delete();
        for (const b of data.blocks) {
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

      onSuccess(data.googleDocUrl);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#18191f] border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Google Docs Sync</h2>
              <p className="text-xs text-muted-foreground">Keep this note synchronized with Google Docs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isConnected === false && (
            <div className="text-center py-6 px-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Connect your Google Account</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                Authorize Synapse to create and sync documents in your Google Drive using official Google Docs APIs.
              </p>
              <a
                href={`/api/integrations/google/connect?returnUrl=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.pathname : '/'
                )}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md transition-colors"
              >
                Connect Google Account
              </a>
            </div>
          )}

          {isConnected === true && (
            <>
              {/* Account Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Connected as <strong className="text-foreground">{googleEmail}</strong></span>
                </span>
                <span className="text-[11px] text-muted-foreground">Two-way Sync</span>
              </div>

              {/* Action 1: Create New Google Doc */}
              <button
                type="button"
                onClick={handleCreateNewDoc}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 hover:text-indigo-200 transition-all text-left text-xs group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Create & sync new Google Doc</div>
                    <div className="text-[11px] text-muted-foreground">
                      Exports &quot;{noteTitle || 'Untitled'}&quot; to a new Google Doc
                    </div>
                  </div>
                </div>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <span className="text-[11px] bg-indigo-500/20 px-2 py-1 rounded-md text-indigo-300 group-hover:bg-indigo-500/30">
                    Create
                  </span>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border/40"></div>
                <span className="shrink-0 mx-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Or link an existing document
                </span>
                <div className="flex-grow border-t border-border/40"></div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/60 border border-border/60 text-xs">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchDocs(e.target.value);
                  }}
                  placeholder="Search your Google Docs..."
                  className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full"
                />
              </div>

              {/* Docs List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="py-8 flex justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  </div>
                ) : docs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching Google Docs found.
                  </div>
                ) : (
                  docs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleLinkDoc(doc.id)}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/60 border border-transparent hover:border-border/50 text-left transition-all text-xs group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-medium text-foreground truncate">{doc.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 group-hover:text-blue-400">
                        Link
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
