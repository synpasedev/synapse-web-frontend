'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Globe,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'note' | 'canvas' | 'database';
  resourceId: string;
  resourceTitle: string;
  resourceIcon?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  resourceIcon,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/share/${resourceType}/${resourceId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Shared Synapse ${resourceType}: ${resourceTitle}`);
    const body = encodeURIComponent(
      `Hey,\n\nI've shared a ${resourceType} with you on Synapse: "${resourceTitle}".\n\nClick the link below to view it (you will need to sign in or create a Synapse account):\n${shareUrl}`
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
          {/* Share Link Box */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Shareable Link
            </label>
            <div className="flex items-center gap-2 p-2 bg-secondary/50 border border-border/60 rounded-xl">
              <div className="flex-1 font-mono text-xs text-muted-foreground truncate px-2 select-all">
                {shareUrl}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
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

          {/* Access Control & Authentication Rule Note */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sign-in Protected Viewing</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Anyone with this link can view this document, but they <strong>must be a Synapse user</strong>.
              If a visitor is not logged in, they will be prompted to sign up or log in first before viewing.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEmailShare}
                className="px-3 py-1.5 rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
