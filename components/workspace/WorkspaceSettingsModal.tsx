'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/use-ui-store';
import { useWorkspace, useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/hooks/use-workspace';
import { WorkspaceType } from '@/types/domain';
import { X, Settings, Trash2, Lock, Users, Save, AlertTriangle } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
