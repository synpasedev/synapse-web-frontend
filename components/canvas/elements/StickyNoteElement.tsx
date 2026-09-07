'use client';

import React, { useState } from 'react';
import { CanvasElement } from '@/types/domain';
import { Trash2, Palette, FileUp, User } from 'lucide-react';

const FIGJAM_PASTELS = [
  { name: 'Butter Yellow', bg: '#713f12', text: '#fef08a', border: '#eab308' },
  { name: 'Bubblegum Pink', bg: '#500724', text: '#fbcfe8', border: '#f43f5e' },
  { name: 'Sky Blue', bg: '#082f49', text: '#bae6fd', border: '#38bdf8' },
  { name: 'Mint Green', bg: '#064e3b', text: '#a7f3d0', border: '#10b981' },
  { name: 'Peach Orange', bg: '#431407', text: '#fed7aa', border: '#f97316' },
  { name: 'Lavender Purple', bg: '#3b0764', text: '#e9d5ff', border: '#c084fc' },
  { name: 'Slate Gray', bg: '#0f172a', text: '#cbd5e1', border: '#94a3b8' },
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
  const author = element.content.author;

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

      {/* Footer: Author Tag & Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        {/* Author pill (FigJam signature) */}
        <div className="flex items-center gap-1">
          {author ? (
            <span className="px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-[10px] font-medium opacity-80">
              {author}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  content: { ...element.content, author: 'You' },
                });
              }}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 rounded text-[10px] flex items-center gap-0.5 transition-opacity"
              title="Add Author Tag"
            >
              <User className="w-2.5 h-2.5" />
              <span>Sign</span>
            </button>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPalette(!showPalette);
              }}
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
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 bottom-7 bg-[#1c1e28] border border-border/80 p-1.5 rounded-xl shadow-2xl flex gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {FIGJAM_PASTELS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      onUpdate({
                        content: { ...element.content, color: c.text, bg_color: c.bg },
                      });
                      setShowPalette(false);
                    }}
                    className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.text }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded-md hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
