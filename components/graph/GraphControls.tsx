'use client';

import React from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw, Filter } from 'lucide-react';

interface GraphControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  nodeCount: number;
  linkCount: number;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  searchQuery,
  onSearchChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  nodeCount,
  linkCount,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
      {/* Search Bar */}
      <div className="pointer-events-auto flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border/80 rounded-xl px-3 py-1.5 shadow-lg w-72">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter notes..."
          className="bg-transparent text-xs text-foreground outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      {/* Stats & Zoom Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-xl px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
          <span>
            <strong className="text-foreground">{nodeCount}</strong> notes
          </span>
          <span>•</span>
          <span>
            <strong className="text-foreground">{linkCount}</strong> links
          </span>
        </div>

        <div className="flex items-center bg-card/80 backdrop-blur-md border border-border/80 rounded-xl p-1 shadow-lg">
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
