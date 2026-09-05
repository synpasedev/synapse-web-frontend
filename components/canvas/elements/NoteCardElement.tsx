'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CanvasElement } from '@/types/domain';
import { FileText, ExternalLink, Trash2 } from 'lucide-react';

export const NoteCardElement: React.FC<{
  element: CanvasElement;
  workspaceId: string;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onStartConnect?: (anchor: 'top' | 'right' | 'bottom' | 'left') => void;
}> = ({ element, workspaceId, isSelected, onDelete, onStartConnect }) => {
  const router = useRouter();
  const noteId = element.content.note_id || '';
  const title = element.content.title || 'Referenced Note';
  const text = element.content.text || 'Live embedded note card from Synapse knowledge base.';

  const handleOpenNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (noteId) {
      router.push(`/${workspaceId}/notes/${noteId}`);
    }
  };

  return (
    <div
      onDoubleClick={handleOpenNote}
      className={`w-full h-full rounded-2xl p-4 bg-[#1a1b24]/90 backdrop-blur-xl border border-border/80 shadow-2xl flex flex-col justify-between group select-none transition-all relative ${
        isSelected ? 'ring-2 ring-indigo-400 border-indigo-500/50 shadow-indigo-500/20' : 'hover:border-border'
      }`}
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
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Top"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('right');
            }}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Right"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('bottom');
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Bottom"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('left');
            }}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Left"
          />
        </>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
          </div>

          <button
            type="button"
            onClick={handleOpenNote}
            className="p-1 rounded-md text-muted-foreground hover:text-indigo-300 hover:bg-secondary transition-colors"
            title="Open Note in Editor"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/80 line-clamp-3 leading-relaxed">
          {text}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground/60">
        <span>Double-click to open</span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
