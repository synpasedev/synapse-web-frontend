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
  const mapHeight = 120;

  // Compute bounding box of all elements
  const bounds = useMemo(() => {
    if (!elements.length) {
      return { minX: 0, maxX: 2000, minY: 0, maxY: 1500, width: 2000, height: 1500 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

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
    const height = Math.max(maxY - minY, 800);

    return { minX, maxX, minY, maxY, width, height };
  }, [elements]);

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
    const screenW = typeof window !== 'undefined' ? window.innerWidth - 240 : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const viewCanvasX = -viewport.x / viewport.zoom;
    const viewCanvasY = -viewport.y / viewport.zoom;
    const viewCanvasW = screenW / viewport.zoom;
    const viewCanvasH = screenH / viewport.zoom;

    return {
      x: (viewCanvasX - bounds.minX) * scale,
      y: (viewCanvasY - bounds.minY) * scale,
      w: Math.max(viewCanvasW * scale, 16),
      h: Math.max(viewCanvasH * scale, 12),
    };
  }, [viewport, bounds, scale]);

  return (
    <div className="fixed top-16 right-6 z-40 select-none">
      <div
        onClick={handleClick}
        className="w-[180px] h-[120px] rounded-2xl bg-[#14151e]/90 backdrop-blur-xl border border-border/80 shadow-2xl p-1.5 relative overflow-hidden cursor-crosshair group transition-all hover:border-indigo-500/50"
      >
        {/* Element dots / rectangles */}
        {elements.map((el) => {
          const x = (el.x - bounds.minX) * scale;
          const y = (el.y - bounds.minY) * scale;
          const w = Math.max(el.width * scale, 4);
          const h = Math.max(el.height * scale, 3);

          let color = '#818cf8';
          if (el.type === 'sticky') color = '#eab308';
          if (el.type === 'note_card') color = '#6366f1';
          if (el.type === 'mindmap_node') color = '#34d399';
          if (el.type === 'frame') color = '#64748b';

          return (
            <div
              key={el.id}
              className="absolute rounded-xs pointer-events-none opacity-80"
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
          className="absolute border-2 border-indigo-400 bg-indigo-500/20 rounded-md pointer-events-none shadow-sm transition-all"
          style={{
            left: `${Math.max(viewRect.x, 0)}px`,
            top: `${Math.max(viewRect.y, 0)}px`,
            width: `${Math.min(viewRect.w, mapWidth)}px`,
            height: `${Math.min(viewRect.h, mapHeight)}px`,
          }}
        />

        {/* Radar Watermark */}
        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] font-medium text-muted-foreground/50 pointer-events-none">
          <MapPin className="w-2.5 h-2.5" />
          <span>Minimap</span>
        </div>
      </div>
    </div>
  );
};
