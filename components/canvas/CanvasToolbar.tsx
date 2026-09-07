'use client';

import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  PenTool,
  Highlighter,
  Eraser,
  StickyNote,
  Smile,
  FileText,
  GitBranch,
  Square,
  Circle,
  Diamond,
  Pill,
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
  LayoutTemplate,
} from 'lucide-react';

export type ActiveTool =
  | 'select'
  | 'hand'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'sticky'
  | 'stamp'
  | 'note_card'
  | 'mindmap'
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'pill'
  | 'frame'
  | 'arrow'
  | 'text';

export const FIGJAM_DRAWING_COLORS = [
  { name: 'Charcoal', color: '#1e293b' },
  { name: 'White', color: '#f8fafc' },
  { name: 'Indigo', color: '#818cf8' },
  { name: 'Sky Blue', color: '#38bdf8' },
  { name: 'Emerald', color: '#34d399' },
  { name: 'Amber', color: '#fbbf24' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Purple', color: '#c084fc' },
];

export const FIGJAM_STAMP_EMOJIS = ['👍', '❤️', '🔥', '🚀', '💡', '⭐', '💯', '❓', '🎉', '💩'];

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
  onOpenTemplates?: () => void;
  // Drawing configurations
  drawingColor: string;
  setDrawingColor: (c: string) => void;
  drawingWidth: number;
  setDrawingWidth: (w: number) => void;
  activeStamp: string;
  setActiveStamp: (emoji: string) => void;
  mode?: 'whiteboard' | 'canvas';
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
  onOpenTemplates,
  drawingColor,
  setDrawingColor,
  drawingWidth,
  setDrawingWidth,
  activeStamp,
  setActiveStamp,
  mode = 'whiteboard',
}) => {
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);

  const isDrawingTool = activeTool === 'pen' || activeTool === 'highlighter';

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 sm:gap-2 select-none pointer-events-auto max-w-[96vw] w-max">
      {/* Floating Sub-palette when Pen/Highlighter or Stamp is Active */}
      {isDrawingTool && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-full overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase mr-1 shrink-0">
            {activeTool === 'pen' ? 'Pen' : 'Highlighter'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {FIGJAM_DRAWING_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setDrawingColor(c.color)}
                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer shrink-0 ${
                  drawingColor === c.color ? 'scale-125 ring-2 ring-indigo-400 border-white' : 'border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.name}
              />
            ))}
          </div>

          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Size</span>
            <input
              type="range"
              min="2"
              max="24"
              value={drawingWidth}
              onChange={(e) => setDrawingWidth(Number(e.target.value))}
              className="w-16 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-4 text-right">
              {drawingWidth}
            </span>
          </div>
        </div>
      )}

      {/* Floating Stamp Picker Bar */}
      {showStampPicker && (
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-w-full overflow-x-auto no-scrollbar">
          {FIGJAM_STAMP_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setActiveStamp(emoji);
                setActiveTool('stamp');
                setShowStampPicker(false);
              }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg hover:bg-secondary/80 hover:scale-110 transition-transform cursor-pointer shrink-0 ${
                activeStamp === emoji ? 'bg-primary/20 ring-2 ring-primary scale-105' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main FigJam Bottom Dock */}
      <div className="flex items-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto no-scrollbar px-1 py-0.5">
        {/* History / Templates / Tidy */}
        <div className="flex items-center gap-1 p-1 sm:p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl shrink-0">
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

          {onOpenTemplates && (
            <>
              <div className="w-px h-4 bg-border/60 mx-0.5" />
              <button
                type="button"
                onClick={onOpenTemplates}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="1-Click FigJam Templates"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </>
          )}

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <button
            type="button"
            onClick={onTidyUp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            title="One-Click Tidy Up"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Tidy</span>
          </button>
        </div>

        {/* Primary FigJam Toolset */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
          {/* Select */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Select & Move (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          {/* Hand / Pan */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('hand');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'hand'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Pan Canvas (H / Space)"
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          {/* Marker / Pen */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Pen / Marker Drawing (P)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('highlighter');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Highlighter (B)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          {/* Sticky Note */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('sticky');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'sticky'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="FigJam Sticky Note (S)"
          >
            <StickyNote className="w-4 h-4 text-amber-300" />
          </button>

          {/* FigJam Stamp Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStampPicker(!showStampPicker);
                setShowShapePicker(false);
                setActiveTool('stamp');
              }}
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'stamp'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
              title="FigJam Stamp & Reactions (X)"
            >
              <Smile className="w-4 h-4 text-pink-400" />
              <span className="text-xs">{activeStamp}</span>
            </button>
          </div>

          {/* Shapes Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowShapePicker(!showShapePicker);
                setShowStampPicker(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                ['rectangle', 'circle', 'diamond', 'pill'].includes(activeTool)
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
              title="Shapes (R)"
            >
              <Square className="w-4 h-4" />
            </button>

            {showShapePicker && (
              <div className="absolute bottom-12 left-0 bg-[#1c1e28] border border-border/80 p-1.5 rounded-2xl shadow-2xl flex flex-col gap-1 z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('rectangle');
                    setShowShapePicker(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-secondary/60 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Rectangle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('circle');
                    setShowShapePicker(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-secondary/60 cursor-pointer"
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>Circle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('diamond');
                    setShowShapePicker(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-secondary/60 cursor-pointer"
                >
                  <Diamond className="w-3.5 h-3.5" />
                  <span>Diamond</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pill');
                    setShowShapePicker(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-secondary/60 cursor-pointer"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Pill</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('text');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'text'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Text Label (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Connector Arrow */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('arrow');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'arrow'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Connector Arrow (A)"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Section Frame */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('frame');
              setShowStampPicker(false);
              setShowShapePicker(false);
            }}
            className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTool === 'frame'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Section Frame (F)"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Spatial Canvas Mode specific shortcuts */}
          {mode === 'canvas' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('note_card');
                  setShowStampPicker(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTool === 'note_card'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
                title="Embed Note Card (N)"
              >
                <FileText className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('mindmap');
                  setShowStampPicker(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTool === 'mindmap'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
                title="Mindmap Node (M)"
              >
                <GitBranch className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Viewport Zoom & Export */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl text-xs shrink-0">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-1 rounded-lg font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors min-w-[48px] text-center cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <button
            type="button"
            onClick={onFitContent}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Fit to Content"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExport}
            className="p-2 rounded-xl text-muted-foreground hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClear}
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear Whiteboard"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
