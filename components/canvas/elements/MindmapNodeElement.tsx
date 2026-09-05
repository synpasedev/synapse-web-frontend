'use client';

import React, { useState } from 'react';
import { CanvasElement } from '@/types/domain';
import { Plus, Sparkles, Trash2, Loader2 } from 'lucide-react';

export const MindmapNodeElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onAddChild?: () => void;
  onAIExpand?: () => Promise<void>;
  onStartConnect?: (anchor: 'top' | 'right' | 'bottom' | 'left') => void;
}> = ({
  element,
  isSelected,
  onUpdate,
  onDelete,
  onAddChild,
  onAIExpand,
  onStartConnect,
}) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const color = element.content.color || '#818cf8';
  const bgColor = element.content.bg_color || '#312e81';

  const handleAIExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAIExpand || isExpanding) return;
    setIsExpanding(true);
    try {
      await onAIExpand();
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <div
      className={`w-full h-full rounded-2xl px-4 py-2 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md border transition-all select-none group relative ${
        isSelected ? 'ring-2 ring-indigo-400 shadow-indigo-500/30' : ''
      }`}
      style={{
        backgroundColor: `${bgColor}dd`,
        borderColor: `${color}60`,
        color,
      }}
    >
      {/* 4 Connection Anchors */}
      {onStartConnect && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('top');
            }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Top"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('right');
            }}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Right"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('bottom');
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Bottom"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('left');
            }}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Left"
          />
        </>
      )}

      <input
        type="text"
        value={element.content.text || ''}
        onChange={(e) =>
          onUpdate({
            content: { ...element.content, text: e.target.value },
          })
        }
        className="w-full bg-transparent border-none outline-none font-semibold text-xs text-foreground"
        style={{ color }}
        placeholder="Mindmap Node..."
      />

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAIExpand && (
          <button
            type="button"
            onClick={handleAIExpand}
            disabled={isExpanding}
            className="p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-all cursor-pointer"
            title="✨ AI Auto-Expand Sub-Ideas"
          >
            {isExpanding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
          </button>
        )}

        {onAddChild && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Add Branch"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors"
          title="Delete Node"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
