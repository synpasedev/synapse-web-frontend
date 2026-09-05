'use client';

import React from 'react';
import { Workspace } from '@/types/domain';
import { ChevronDown, Sparkles } from 'lucide-react';

export const WorkspaceSwitcher: React.FC<{ workspace: Workspace | null }> = ({ workspace }) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer border border-border/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-indigo-500/20 shrink-0">
          {workspace?.icon || '🧠'}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-foreground truncate">
            {workspace?.name || 'Personal Workspace'}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Synapse Local
          </div>
        </div>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </div>
  );
};
