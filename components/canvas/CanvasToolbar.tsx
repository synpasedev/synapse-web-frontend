'use client';

import React from 'react';
import {
  MousePointer,
  Hand,
  StickyNote,
  FileText,
  GitBranch,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  Layers,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RotateCcw,
} from 'lucide-react';

export type ActiveTool =
  | 'select'
  | 'hand'
  | 'sticky'
  | 'note_card'
  | 'mindmap'
  | 'rectangle'
  | 'circle'
  | 'frame'
  | 'arrow'
  | 'text';

export const CanvasToolbar: React.FC<{
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTidyUp: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitContent: () => void;
  onExport: () => void;
  onClear: () => void;
}> = ({
  activeTool,
  setActiveTool,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTidyUp,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitContent,
  onExport,
  onClear,
}) => {
    const tools: Array<{ id: ActiveTool; label: string; icon: React.ReactNode; shortcut: string }> = [
      { id: 'select', label: 'Select & Move', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
      { id: 'hand', label: 'Pan Canvas', icon: <Hand className="w-4 h-4" />, shortcut: 'H' },
      { id: 'sticky', label: 'Sticky Note', icon: <StickyNote className="w-4 h-4" />, shortcut: 'S' },
      { id: 'note_card', label: 'Embed Note Card', icon: <FileText className="w-4 h-4" />, shortcut: 'N' },
      { id: 'mindmap', label: 'Mindmap Node', icon: <GitBranch className="w-4 h-4" />, shortcut: 'M' },
      { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
      { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
      { id: 'frame', label: 'Section Frame Container', icon: <Layers className="w-4 h-4" />, shortcut: 'F' },
      { id: 'arrow', label: 'Connector Arrow', icon: <ArrowUpRight className="w-4 h-4" />, shortcut: 'A' },
      { id: 'text', label: 'Text Label', icon: <Type className="w-4 h-4" />, shortcut: 'T' },
    ];

    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 select-none">
        {/* Undo / Redo & Tidy Palette */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#181922]/95 backdrop-blur-xl border border-border/80 shadow-2xl shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <button
            type="button"
            onClick={onTidyUp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title="One-Click Tidy Up & Auto-Layout"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Tidy Up</span>
          </button>
        </div>

        {/* Primary Tool Palette */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#181922]/95 backdrop-blur-xl border border-border/80 shadow-2xl">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTool(t.id)}
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${activeTool === t.id
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Viewport Zoom & Actions */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#181922]/95 backdrop-blur-xl border border-border/80 shadow-2xl text-xs">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-1 rounded-lg font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors min-w-[48px] text-center"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <button
            type="button"
            onClick={onFitContent}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Fit to Content"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExport}
            className="p-2 rounded-xl text-muted-foreground hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
            title="Export Canvas JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClear}
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Clear Canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };
