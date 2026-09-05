'use client';

import React, { useState } from 'react';
import { CanvasElement } from '@/types/domain';
import { Trash2, Palette, FileUp } from 'lucide-react';

const PASTEL_COLORS = [
  { name: 'Yellow', bg: '#713f12', text: '#fef08a', border: '#eab308' },
  { name: 'Lavender', bg: '#3b0764', text: '#e9d5ff', border: '#a855f7' },
  { name: 'Emerald', bg: '#064e3b', text: '#a7f3d0', border: '#10b981' },
  { name: 'Rose', bg: '#4c0519', text: '#fecdd3', border: '#f43f5e' },
  { name: 'Cyan', bg: '#083344', text: '#a5f3fc', border: '#06b6d4' },
];

export const StickyNoteElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onPromoteToNote?: () => void;
  onStartConnect?: (anchor: 'top' | 'right' | 'bottom' | 'left') => void;
}> = ({ element, isSelected, onUpdate, onDelete, onPromoteToNote, onStartConnect }) => {
  const [showPalette, setShowPalette] = useState(false);
  const color = element.content.color || '#fef08a';
  const bgColor = element.content.bg_color || '#713f12';

  return (
    <div
      className={`w-full h-full rounded-2xl p-4 flex flex-col justify-between shadow-xl backdrop-blur-md border transition-all select-none group relative ${
        isSelected ? 'ring-2 ring-indigo-400 shadow-indigo-500/20' : ''
      }`}
      style={{
        backgroundColor: `${bgColor}dd`,
        borderColor: `${color}40`,
        color,
      }}
    >
      {/* 4 Hover Connection Anchors */}
      {onStartConnect && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('top');
            }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Top"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('right');
            }}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Right"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('bottom');
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Bottom"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('left');
            }}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Left"
          />
        </>
      )}

      <textarea
        value={element.content.text || ''}
        onChange={(e) =>
          onUpdate({
            content: { ...element.content, text: e.target.value },
          })
        }
        placeholder="Type sticky note..."
        className="w-full h-full bg-transparent border-none outline-none resize-none font-sans text-xs leading-relaxed placeholder:opacity-40"
        style={{ color }}
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 relative">
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Change Color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {onPromoteToNote && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPromoteToNote();
              }}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              title="Promote to Full Workspace Note"
            >
              <FileUp className="w-3.5 h-3.5" />
            </button>
          )}

          {showPalette && (
            <div className="absolute left-0 bottom-7 bg-[#1c1e28] border border-border/80 p-1.5 rounded-xl shadow-2xl flex gap-1.5 z-50">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onUpdate({
                      content: { ...element.content, color: c.text, bg_color: c.bg },
                    });
                    setShowPalette(false);
                  }}
                  className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.text }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md hover:bg-rose-500/20 text-rose-300 transition-colors"
          title="Delete Note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
