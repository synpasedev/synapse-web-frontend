'use client';

import React from 'react';
import { CanvasElement } from '@/types/domain';
import { Trash2, Plus } from 'lucide-react';

export const StampElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}> = ({ element, isSelected, onUpdate, onDelete }) => {
  const emoji = element.content.emoji || '👍';
  const count = element.content.count || 1;
  const author = element.content.author;

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      content: {
        ...element.content,
        count: count + 1,
      },
    });
  };

  return (
    <div
      className={`relative select-none group flex flex-col items-center justify-center p-1 rounded-2xl transition-all ${
        isSelected ? 'ring-2 ring-indigo-400/80 shadow-lg shadow-indigo-500/20' : ''
      }`}
      style={{
        width: `${element.width}px`,
        height: `${element.height}px`,
      }}
    >
      {/* Emoji Stamp Badge */}
      <div className="relative flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer">
        <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none">
          {emoji}
        </span>

        {/* Count Pill */}
        {count > 1 && (
          <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-pink-500 text-white font-bold text-[10px] shadow-sm border border-white/40">
            {count}
          </span>
        )}
      </div>

      {/* Author Tag */}
      {author && (
        <span className="mt-0.5 px-1.5 py-0.2 rounded-full bg-[#1e2029]/90 border border-border/50 text-[9px] font-medium text-foreground/80 whitespace-nowrap shadow-xs">
          {author}
        </span>
      )}

      {/* Hover Quick Actions */}
      <div className="absolute -top-3 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          type="button"
          onClick={handleIncrement}
          className="p-1 rounded-full bg-secondary/90 hover:bg-secondary text-foreground text-xs shadow-md border border-border/60"
          title="Add +1 to stamp"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs shadow-md border border-rose-500/30"
          title="Delete Stamp"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
