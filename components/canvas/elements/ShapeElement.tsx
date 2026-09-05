'use client';

import React from 'react';
import { CanvasElement } from '@/types/domain';

export const ShapeElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onStartConnect?: (anchor: 'top' | 'right' | 'bottom' | 'left') => void;
}> = ({ element, isSelected, onUpdate, onStartConnect }) => {
  const shape = element.content.shape_type || 'rectangle';
  const color = element.content.color || '#6366f1';
  const strokeColor = element.content.stroke_color || color;

  let shapeClass = 'rounded-2xl';
  if (shape === 'circle') shapeClass = 'rounded-full';
  if (shape === 'diamond') shapeClass = 'rotate-45 rounded-lg';
  if (shape === 'pill') shapeClass = 'rounded-full';

  return (
    <div
      className={`w-full h-full flex items-center justify-center p-3 border-2 transition-all select-none group relative ${shapeClass} ${
        isSelected ? 'ring-2 ring-indigo-400 shadow-indigo-500/30' : ''
      }`}
      style={{
        backgroundColor: `${color}22`,
        borderColor: strokeColor,
      }}
    >
      {onStartConnect && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('top');
            }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Top"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('right');
            }}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Right"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('bottom');
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
            title="Connect Bottom"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect('left');
            }}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-white opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shadow-md z-30 cursor-crosshair"
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
        className={`w-full bg-transparent border-none outline-none text-center font-medium text-xs text-foreground placeholder:text-muted-foreground/40 ${
          shape === 'diamond' ? '-rotate-45' : ''
        }`}
        placeholder="Label..."
      />
    </div>
  );
};
