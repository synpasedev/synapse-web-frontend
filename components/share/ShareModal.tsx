'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  ShieldCheck,
  Loader2,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { localDb } from '@/lib/dexie/db';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'note' | 'canvas' | 'database';
  resourceId: string;
  resourceTitle: string;
  resourceIcon?: string;
}

type PublishState = 'idle' | 'publishing' | 'published' | 'error';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  resourceIcon,
}) => {
  const [copied, setCopied] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  // Auto-publish as soon as modal opens
  useEffect(() => {
    if (isOpen && publishState === 'idle') {
      publishToServer();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/share/${resourceType}/${resourceId}`;

  async function publishToServer() {
    try {
      setPublishState('publishing');
      setPublishError(null);

      // Collect the current content from local IndexedDB
      let resource: any = null;
      let blocks: any[] = [];

      if (resourceType === 'note') {
        resource = await localDb.notes.get(resourceId);
        if (resource) {
          blocks = await localDb.blocks
            .where('note_id')
            .equals(resourceId)
            .sortBy('sort_order');
        }
      } else if (resourceType === 'canvas') {
        resource = await localDb.whiteboards.get(resourceId);
      } else if (resourceType === 'database') {
        resource = await localDb.databases.get(resourceId);
      }

      if (!resource) {
        throw new Error(`Could not find ${resourceType} with ID "${resourceId}" in local database.`);
      }

      // Get publisher name from localStorage
      let publisherName = 'Synapse User';
      try {
        const stored = localStorage.getItem('synapse_local_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          publisherName = parsed.name || parsed.email || publisherName;
        }
      } catch {}

      // POST snapshot to server
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: resourceType,
          id: resourceId,
          resource,
          blocks,
          publisherName,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || 'Failed to publish share');
      }

      setPublishState('published');
    } catch (err: any) {
      setPublishState('error');
      setPublishError(err.message || 'Failed to publish content to share server');
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Shared Synapse ${resourceType}: ${resourceTitle}`);
    const body = encodeURIComponent(
      `Hey,\n\nI've shared a ${resourceType} with you on Synapse: "${resourceTitle}".\n\nClick the link below to view it (you may need to sign in or create a free Synapse account):\n${shareUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const typeLabel =
    resourceType === 'note'
      ? 'Note'
      : resourceType === 'canvas'
      ? 'Canvas / Whiteboard'
      : 'Database';

  const defaultIcon =
    resourceType === 'note' ? '📄' : resourceType === 'canvas' ? '🎨' : '🎯';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] bg-card border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20 shrink-0">
              {resourceIcon || defaultIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">
                  Share {typeLabel}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider shrink-0">
                  {resourceType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xs sm:max-w-sm">
                "{resourceTitle || 'Untitled'}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Publish Status */}
          {publishState === 'publishing' && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border/50">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="text-xs text-muted-foreground">
                Publishing current content to share server…
              </span>
            </div>
          )}

          {publishState === 'error' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <p className="text-xs text-rose-400 font-medium">Failed to publish share</p>
              <p className="text-[11px] text-muted-foreground">{publishError}</p>
              <button
                type="button"
                onClick={publishToServer}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Share Link Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Shareable Link
              </label>
              {publishState === 'published' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Globe className="w-3 h-3" />
                  Published & ready to share
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 p-2 bg-secondary/50 border border-border/60 rounded-xl">
              <div className="flex-1 font-mono text-xs text-muted-foreground truncate px-2 select-all">
                {shareUrl}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                disabled={publishState === 'publishing'}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-wait ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Auth & Access Info */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sign-in Protected — Your Content, Your Control</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The <strong>current state</strong> of this {resourceType} is published to our secure share server.
              Anyone with this link can view it — but they <strong>must sign in or sign up</strong> first.
              To update what collaborators see, click <strong>Re-share</strong> after making changes.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEmailShare}
                disabled={publishState === 'publishing'}
                className="px-3 py-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Email Link</span>
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Open Preview</span>
              </a>

              {publishState === 'published' && (
                <button
                  type="button"
                  onClick={publishToServer}
                  className="px-3 py-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Re-share</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
