'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  resourceType: 'note' | 'canvas' | 'database';
  resourceId: string;
  resourceTitle: string;
  resourceIcon?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'pill';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  resourceType,
  resourceId,
  resourceTitle,
  resourceIcon,
  className = '',
  variant = 'default',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary text-foreground text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${className}`}
        title={`Share this ${resourceType}`}
      >
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>Share</span>
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceTitle={resourceTitle}
        resourceIcon={resourceIcon}
      />
    </>
  );
};
