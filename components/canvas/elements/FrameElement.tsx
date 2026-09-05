'use client';

import React from 'react';
import { CanvasElement } from '@/types/domain';
import { Layers, Trash2 } from 'lucide-react';

export const FrameElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}> = ({ element, isSelected, onUpdate, onDelete }) => {
  const title = element.content.title || 'Section Frame';
  const color = element.content.color || '#6366f1';

  return (
    <div
      className={`w-full h-full rounded-3xl border-2 border-dashed p-4 flex flex-col justify-between transition-all select-none group ${
        isSelected ? 'border-indigo-400 shadow-2xl shadow-indigo-500/10 ring-2 ring-indigo-400/20' : 'border-white/20'
      }`}
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}40`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white/5 text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) =>
              onUpdate({
                content: { ...element.content, title: e.target.value },
              })
            }
            className="bg-transparent border-none outline-none font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground focus:text-foreground"
            placeholder="FRAME TITLE..."
          />
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Delete Frame"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-[10px] text-muted-foreground/30 font-mono tracking-widest text-right pointer-events-none">
        SECTION
      </div>
    </div>
  );
};
