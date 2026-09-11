'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/use-ui-store';
import { useWorkspace, useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/hooks/use-workspace';
import { WorkspaceType } from '@/types/domain';
import { X, Settings, Trash2, Lock, Users, Save, AlertTriangle, Download, Upload, Database, Check } from 'lucide-react';
import { localDb } from '@/lib/dexie/db';

const POPULAR_ICONS = ['🚀', '💼', '⚡', '🧠', '💡', '🎨', '🎯', '🌐', '🛠️', '📚', '🔬', '🪐'];

export const WorkspaceSettingsModal: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const router = useRouter();
  const { isWorkspaceSettingsOpen, setWorkspaceSettingsOpen } = useUIStore();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: allWorkspaces = [] } = useWorkspaces();

  const { mutateAsync: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace();
  const { mutateAsync: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();

  const [name, setName] = useState(workspace?.name || '');
  const [icon, setIcon] = useState(workspace?.icon || '🧠');
  const [type, setType] = useState<WorkspaceType>(workspace?.type || 'private');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  // Sync internal state when modal opens or workspace loads
  React.useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setIcon(workspace.icon || '🧠');
      setType(workspace.type || 'private');
    }
  }, [workspace]);

  if (!isWorkspaceSettingsOpen || !workspace) return null;

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setWorkspaceSettingsOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await updateWorkspace({
        workspaceId,
        name: name.trim(),
        icon,
        type,
      });
      handleClose();
    } catch (err) {
      console.error('Failed to update workspace:', err);
    }
  };

  const handleDelete = async () => {
    if (allWorkspaces.length <= 1) {
      alert('You cannot delete your only workspace.');
      return;
    }

    try {
      await deleteWorkspace({ workspaceId });
      handleClose();
      // Navigate to the first remaining workspace
      const remaining = allWorkspaces.filter((w) => w.id !== workspaceId);
      if (remaining.length > 0) {
        router.push(`/${remaining[0].id}/notes`);
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupStatus('');
    try {
      const backup = {
        version: 4,
        synapse_app: 'synapse',
        exportedAt: new Date().toISOString(),
        workspaces: await localDb.workspaces.toArray(),
        workspace_members: await localDb.workspace_members.toArray(),
        notes: await localDb.notes.toArray(),
        blocks: await localDb.blocks.toArray(),
        links: await localDb.links.toArray(),
        templates: await localDb.templates.toArray(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synapse-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus(`Exported ${backup.notes.length} note(s)!`);
      setTimeout(() => setBackupStatus(''), 4000);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export backup: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupStatus('');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.notes && !backup.workspaces) {
        throw new Error('Invalid Synapse backup file format.');
      }

      await localDb.transaction(
        'rw',
        [
          localDb.workspaces,
          localDb.workspace_members,
          localDb.notes,
          localDb.blocks,
          localDb.links,
          localDb.templates,
        ],
        async () => {
          if (backup.workspaces?.length) await localDb.workspaces.bulkPut(backup.workspaces);
          if (backup.workspace_members?.length) await localDb.workspace_members.bulkPut(backup.workspace_members);
          if (backup.notes?.length) await localDb.notes.bulkPut(backup.notes);
          if (backup.blocks?.length) await localDb.blocks.bulkPut(backup.blocks);
          if (backup.links?.length) await localDb.links.bulkPut(backup.links);
          if (backup.templates?.length) await localDb.templates.bulkPut(backup.templates);
        }
      );

      setBackupStatus('Imported successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      console.error('Import failed:', err);
      alert('Failed to import backup: ' + err.message);
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-lg max-h-[92vh] bg-card border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Workspace Settings</h2>
              <p className="text-xs text-muted-foreground">
                Manage name, icon, privacy, and collaboration preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Privacy & Type */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Workspace Privacy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('private')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  type === 'private'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-border/60 hover:bg-secondary/40'
                }`}
              >
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-foreground">Private Space</div>
                  <div className="text-[10px] text-muted-foreground">Only accessible by you</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('shared')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  type === 'shared'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-border/60 hover:bg-secondary/40'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-foreground">Shared Team Space</div>
                  <div className="text-[10px] text-muted-foreground">Collaborate with members</div>
                </div>
              </button>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Workspace Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    icon === emoji
                      ? 'bg-primary/20 border-2 border-primary scale-110 shadow-xs'
                      : 'bg-secondary/60 hover:bg-secondary border border-border/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Data Backup & Migration */}
          <div className="pt-4 border-t border-border/40">
            <div className="p-3.5 bg-secondary/30 border border-border/60 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold text-foreground">Data Backup & Migration</div>
                    <div className="text-[11px] text-muted-foreground">
                      Export all notes to transfer between localhost and deployed sites, or create a safe backup.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 border border-border/70 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-foreground disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isExporting ? 'Exporting...' : 'Export Backup (.json)'}</span>
                </button>

                <label className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isImporting ? 'Restoring...' : 'Import Backup'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>

                {backupStatus && (
                  <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3 h-3" /> {backupStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-border/40">
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-400">Delete Workspace</div>
                  <div className="text-[11px] text-muted-foreground">
                    Permanently delete this workspace, its notes, canvases and members.
                  </div>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={allWorkspaces.length <= 1}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Delete...
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-md transition-colors shadow-xs"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isUpdating}
              className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
