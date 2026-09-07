'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/use-ui-store';
import { useCreateWorkspace } from '@/hooks/use-workspace';
import { WorkspaceType } from '@/types/domain';
import { X, Sparkles, Lock, Users, ArrowRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

const POPULAR_ICONS = ['🚀', '💼', '⚡', '🧠', '💡', '🎨', '🎯', '🌐', '🛠️', '📚', '🔬', '🪐'];

export const CreateWorkspaceModal: React.FC = () => {
  const router = useRouter();
  const { isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen } = useUIStore();
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🚀');
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('shared');

  if (!isCreateWorkspaceModalOpen) return null;

  const handleClose = () => {
    setName('');
    setSelectedIcon('🚀');
    setWorkspaceType('shared');
    setCreateWorkspaceModalOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      const newWs = await createWorkspace({
        name: trimmedName,
        icon: selectedIcon,
        type: workspaceType,
      });

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
      });

      handleClose();
      router.push(`/${newWs.id}/notes`);
    } catch (err) {
      console.error('Failed to create workspace:', err);
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
              {selectedIcon}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Create Workspace</h2>
              <p className="text-xs text-muted-foreground">
                Set up a private brain or a collaborative team space
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

        {/* Body Form */}
        <form onSubmit={handleCreate} className="p-5 space-y-5">
          {/* Workspace Type Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Workspace Purpose
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Shared Option */}
              <button
                type="button"
                onClick={() => setWorkspaceType('shared')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  workspaceType === 'shared'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-border/60 hover:border-border hover:bg-secondary/40'
                }`}
              >
                {workspaceType === 'shared' && (
                  <span className="absolute top-3 right-3 text-indigo-400">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Shared Workspace
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Invite members, collaborate live, and assign roles.
                  </div>
                </div>
              </button>

              {/* Private Option */}
              <button
                type="button"
                onClick={() => setWorkspaceType('private')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  workspaceType === 'private'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-border/60 hover:border-border hover:bg-secondary/40'
                }`}
              >
                {workspaceType === 'private' && (
                  <span className="absolute top-3 right-3 text-indigo-400">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Private Workspace
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Only you can view and edit. Strictly personal space.
                  </div>
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
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    selectedIcon === emoji
                      ? 'bg-primary/20 border-2 border-primary scale-110 shadow-xs'
                      : 'bg-secondary/60 hover:bg-secondary hover:scale-105 border border-border/50'
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
              placeholder={workspaceType === 'shared' ? 'e.g., Engineering Team, Product Ops' : 'e.g., Personal Journal, Deep Work'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              autoFocus
            />
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
              disabled={!name.trim() || isPending}
              className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{isPending ? 'Creating...' : 'Create Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
