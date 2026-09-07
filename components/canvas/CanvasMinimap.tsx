'use client';

import React, { useMemo } from 'react';
import { CanvasElement } from '@/types/domain';
import { MapPin } from 'lucide-react';

export const CanvasMinimap: React.FC<{
  elements: CanvasElement[];
  viewport: { x: number; y: number; zoom: number };
  onCenterAt: (canvasX: number, canvasY: number) => void;
}> = ({ elements, viewport, onCenterAt }) => {
  const mapWidth = 180;
  const mapHeight = 115;

  const screenW = typeof window !== 'undefined' ? window.innerWidth - 240 : 1200;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Viewport bounds on canvas
  const viewCanvasX = -viewport.x / viewport.zoom;
  const viewCanvasY = -viewport.y / viewport.zoom;
  const viewCanvasW = screenW / viewport.zoom;
  const viewCanvasH = screenH / viewport.zoom;

  // Compute bounding box incorporating elements and current viewport
  const bounds = useMemo(() => {
    let minX = viewCanvasX;
    let maxX = viewCanvasX + viewCanvasW;
    let minY = viewCanvasY;
    let maxY = viewCanvasY + viewCanvasH;

    elements.forEach((el) => {
      minX = Math.min(minX, el.x);
      maxX = Math.max(maxX, el.x + el.width);
      minY = Math.min(minY, el.y);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const padding = 200;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const width = Math.max(maxX - minX, 1000);
    const height = Math.max(maxY - minY, 750);

    return { minX, maxX, minY, maxY, width, height };
  }, [elements, viewCanvasX, viewCanvasY, viewCanvasW, viewCanvasH]);

  const scale = Math.min(mapWidth / bounds.width, mapHeight / bounds.height);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const canvasX = bounds.minX + clickX / scale;
    const canvasY = bounds.minY + clickY / scale;

    onCenterAt(canvasX, canvasY);
  };

  // Viewport rect representation on minimap
  const viewRect = useMemo(() => {
    const rawW = viewCanvasW * scale;
    const rawH = viewCanvasH * scale;

    const w = Math.min(Math.max(rawW, 16), mapWidth - 4);
    const h = Math.min(Math.max(rawH, 12), mapHeight - 4);

    const rawX = (viewCanvasX - bounds.minX) * scale;
    const rawY = (viewCanvasY - bounds.minY) * scale;

    const x = Math.max(2, Math.min(rawX, mapWidth - w - 2));
    const y = Math.max(2, Math.min(rawY, mapHeight - h - 2));

    return { x, y, w, h };
  }, [viewCanvasX, viewCanvasY, viewCanvasW, viewCanvasH, bounds.minX, bounds.minY, scale, mapWidth, mapHeight]);

  return (
    <div className="fixed top-16 right-6 z-40 select-none animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto">
      <div className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl p-2 transition-all">
        {/* Header with Title & Zoom */}
        <div className="flex items-center justify-between px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <MapPin className="w-3 h-3 text-primary" />
            <span>Minimap</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/80">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </div>

        {/* Inner Preview Box */}
        <div
          onClick={handleClick}
          className="w-[180px] h-[115px] rounded-xl bg-background/70 border border-border/60 relative overflow-hidden cursor-crosshair group/map transition-colors hover:border-primary/40"
        >
          {/* Element dots / rectangles */}
          {elements.map((el) => {
            const x = (el.x - bounds.minX) * scale;
            const y = (el.y - bounds.minY) * scale;
            const w = Math.max(el.width * scale, 3.5);
            const h = Math.max(el.height * scale, 2.5);

            let color = 'var(--primary)';
            if (el.type === 'sticky') color = '#eab308';
            if (el.type === 'note_card') color = '#818cf8';
            if (el.type === 'mindmap_node') color = '#34d399';
            if (el.type === 'frame') color = '#64748b';
            if (el.type === 'stamp') color = '#f43f5e';

            return (
              <div
                key={el.id}
                className="absolute rounded-xs pointer-events-none opacity-85"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  backgroundColor: color,
                }}
              />
            );
          })}

          {/* Viewport Boundary Rect */}
          <div
            className="absolute border border-primary bg-primary/15 rounded-md pointer-events-none shadow-xs transition-all ring-1 ring-primary/20"
            style={{
              left: `${viewRect.x}px`,
              top: `${viewRect.y}px`,
              width: `${viewRect.w}px`,
              height: `${viewRect.h}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
