'use client';

import React, { useState } from 'react';
import { Database, DatabaseRow } from '@/types/domain';
import { useUpdateDatabaseRow, useAddDatabaseRow } from '@/hooks/use-databases';
import { Plus, GripVertical, Calendar, Sparkles } from 'lucide-react';

const COLUMNS = ['Backlog', 'In Progress', 'Done'];

export const BoardView: React.FC<{ database: Database }> = ({ database }) => {
  const { mutate: updateRow } = useUpdateDatabaseRow(database.id);
  const { mutate: addRow } = useAddDatabaseRow(database.id);

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleMove = (rowId: string, targetStatus: string) => {
    updateRow({
      rowId,
      properties: { 'p-status': targetStatus },
    });
  };

  const handleAddInColumn = (status: string) => {
    const title = prompt(`Task name for ${status}:`);
    if (!title?.trim()) return;

    addRow({
      'p-title': title.trim(),
      'p-status': status,
      'p-priority': 'Medium',
      'p-due': new Date().toISOString().split('T')[0],
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
    setDragOverCol(null);
  };

  const handleDragOverCol = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== col) {
      setDragOverCol(col);
    }
  };

  const handleDragEnterCol = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDragLeaveCol = (e: React.DragEvent, col: string) => {
    // Only reset if leaving the column boundary, not entering a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverCol === col) {
        setDragOverCol(null);
      }
    }
  };

  const handleDropOnCol = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rowId = e.dataTransfer.getData('text/plain') || draggedRowId;
    if (rowId) {
      handleMove(rowId, col);
    }
    setDraggedRowId(null);
    setDragOverCol(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {COLUMNS.map((col) => {
        const rowsInCol = database.rows.filter(
          (r) => (r.properties['p-status'] || 'Backlog') === col
        );
        const isOver = dragOverCol === col;

        return (
          <div
            key={col}
            onDragOver={(e) => handleDragOverCol(e, col)}
            onDragEnter={(e) => handleDragEnterCol(e, col)}
            onDragLeave={(e) => handleDragLeaveCol(e, col)}
            onDrop={(e) => handleDropOnCol(e, col)}
            className={`flex flex-col bg-card/40 backdrop-blur-md rounded-2xl border p-4 min-h-[460px] transition-all duration-200 ${
              isOver
                ? 'border-indigo-500/70 bg-indigo-500/[0.04] ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/5'
                : 'border-border/70 hover:border-border'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3.5 px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    col === 'Done'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : col === 'In Progress'
                      ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-bold text-foreground tracking-tight">{col}</span>
                <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {rowsInCol.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddInColumn(col)}
                title={`Add task to ${col}`}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards Container */}
            <div className="space-y-3 flex-1 flex flex-col">
              {rowsInCol.map((row) => {
                const isDragging = draggedRowId === row.id;

                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverCol !== col) {
                        setDragOverCol(col);
                      }
                    }}
                    onDrop={(e) => handleDropOnCol(e, col)}
                    className={`group relative p-4 rounded-xl border bg-secondary/50 transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                      isDragging
                        ? 'opacity-40 scale-[0.97] ring-2 ring-indigo-500/50 border-indigo-500 shadow-2xl'
                        : 'border-border/80 hover:border-indigo-500/40 hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Drag Affordance Handle Icon */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-semibold text-foreground leading-snug break-words flex-1">
                        {row.properties['p-title'] || 'Untitled Task'}
                      </div>
                      <div
                        className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-muted-foreground transition-opacity shrink-0 pt-0.5 cursor-grab active:cursor-grabbing"
                        title="Drag to move"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Meta Row: Priority, Due Date, and Quick Fallback Select */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40 mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                            row.properties['p-priority'] === 'Urgent' || row.properties['p-priority'] === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : row.properties['p-priority'] === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {row.properties['p-priority'] || 'Medium'}
                        </span>

                        {row.properties['p-due'] && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
                            <Calendar className="w-2.5 h-2.5" />
                            {row.properties['p-due']}
                          </span>
                        )}
                      </div>

                      {/* Quick Move Select Dropdown (accessible alternative) */}
                      <select
                        value={col}
                        onChange={(e) => handleMove(row.id, e.target.value)}
                        className="bg-black/30 border border-border/40 text-[10px] rounded px-1.5 py-0.5 text-muted-foreground outline-none cursor-pointer group-hover:border-indigo-500/30"
                        title="Quick Move"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c} value={c}>
                            → {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* Dynamic Drop Zone Indicator */}
              {isOver && (
                <div className="h-16 rounded-xl border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-400 animate-pulse transition-all">
                  Drop into {col}
                </div>
              )}

              {/* Empty state when column has no items */}
              {rowsInCol.length === 0 && !isOver && (
                <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-border/50 rounded-xl text-center px-4">
                  <span className="text-xs text-muted-foreground">No tasks in {col}</span>
                  <button
                    type="button"
                    onClick={() => handleAddInColumn(col)}
                    className="mt-2 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    + Add a task
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
