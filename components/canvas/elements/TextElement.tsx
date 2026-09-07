'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CanvasElement } from '@/types/domain';
import { Trash2 } from 'lucide-react';

export const TextElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
}> = ({ element, isSelected, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const text = element.content.text || '';
  const fontSize = element.content.font_size || 16;
  const color = element.content.color || 'var(--foreground)';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`w-full h-full p-1 relative group select-none flex items-center transition-all ${
        isSelected ? 'ring-2 ring-indigo-400/80 rounded-lg shadow-md' : ''
      }`}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) =>
            onUpdate({
              content: { ...element.content, text: e.target.value },
            })
          }
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-full h-full bg-transparent border border-indigo-400/50 rounded p-1 outline-none resize-none font-sans leading-snug"
          style={{ fontSize: `${fontSize}px`, color }}
        />
      ) : (
        <div
          className="w-full h-full whitespace-pre-wrap font-sans font-medium leading-snug cursor-text"
          style={{ fontSize: `${fontSize}px`, color }}
        >
          {text || <span className="opacity-30 italic">Type text...</span>}
        </div>
      )}

      {/* Delete button */}
      <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs shadow-md border border-rose-500/30"
          title="Delete Text"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};
