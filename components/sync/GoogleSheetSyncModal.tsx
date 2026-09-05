'use client';

import React, { useState, useEffect } from 'react';
import { localDb } from '@/lib/dexie/db';
import { Database } from '@/types/domain';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Loader2,
  X,
  PlusCircle,
  Link2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  workspaceId: string;
  onSuccess: (googleSheetUrl: string) => void;
}

interface DriveSpreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
}

export const GoogleSheetSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  database,
  workspaceId,
  onSuccess,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/integrations/google/status')
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected);
        setConnectedEmail(data.email || null);
      })
      .catch(() => setIsConnected(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isConnected || activeTab !== 'link') return;

    const timer = setTimeout(() => {
      fetchSpreadsheets(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, isConnected, activeTab, searchQuery]);

  const fetchSpreadsheets = async (query: string) => {
    setIsLoadingDocs(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/google/sheets/list?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setSpreadsheets(data.spreadsheets || []);
      } else {
        setError(data.error || 'Failed to list Google Spreadsheets');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleCreateNewSheet = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const localDatabase = await localDb.databases.get(database.id);

      const res = await fetch('/api/integrations/google/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          databaseId: database.id,
          workspaceId,
          clientDatabase: localDatabase || database,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Google Sheet');

      onSuccess(data.googleSheetUrl);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkSheet = async (googleSpreadsheetId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/google/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          databaseId: database.id,
          workspaceId,
          googleSpreadsheetId,
          clientDatabase: database,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link Google Sheet');

      // Update local database rows in Dexie if returned
      if (data.updatedRows && data.updatedRows.length > 0) {
        const localDbRecord = await localDb.databases.get(database.id);
        if (localDbRecord) {
          await localDb.databases.update(database.id, {
            rows: data.updatedRows,
            updated_at: new Date().toISOString(),
          });
        }
      }

      onSuccess(data.googleSheetUrl);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Google Sheets Synchronization
              </h2>
              <p className="text-xs text-muted-foreground">
                Bi-directional sync between Synapse Database &amp; Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isConnected === null ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Checking Google Account connection...</span>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Connect your Google Account</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Authorize Synapse to create and synchronize spreadsheets in your Google Drive.
                </p>
              </div>
              <a
                href={`/api/integrations/google/connect?returnUrl=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.pathname : '/'
                )}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-500/25 cursor-pointer"
              >
                <span>Connect Google Account</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <>
              {/* Account Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-muted-foreground">Connected to:</span>
                  <span className="font-semibold text-foreground">{connectedEmail}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                  Active
                </span>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
                    activeTab === 'create'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Create New Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all cursor-pointer ${
                    activeTab === 'link'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Link Existing Sheet
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Tab 1: Create New Sheet */}
              {activeTab === 'create' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Creates a new Google Spreadsheet in your Google Drive containing all columns and rows from{' '}
                    <span className="text-foreground font-semibold">&ldquo;{database.title || 'Untitled'}&rdquo;</span>.
                  </p>

                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 text-xs space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Columns:</span>
                      <span className="text-foreground font-medium">{database.properties.length} columns</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Rows:</span>
                      <span className="text-foreground font-medium">{database.rows.length} rows</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md hover:shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Spreadsheet...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Google Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Link Existing Sheet */}
              {activeTab === 'link' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search spreadsheets in Google Drive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {isLoadingDocs ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Searching Drive...</span>
                      </div>
                    ) : spreadsheets.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        No spreadsheets found.
                      </div>
                    ) : (
                      spreadsheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-emerald-500/40 hover:bg-secondary/40 transition-all text-xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-medium text-foreground truncate">{sheet.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkSheet(sheet.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 font-semibold transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
