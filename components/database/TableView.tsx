'use client';

import React, { useState } from 'react';
import { Database, DatabaseProperty, DatabaseRow } from '@/types/domain';
import { useAddDatabaseRow, useUpdateDatabaseRow } from '@/hooks/use-databases';
import { Plus, CheckCircle2, Clock, Calendar, Tag, AlertCircle } from 'lucide-react';

export const TableView: React.FC<{ database: Database }> = ({ database }) => {
  const { mutate: addRow } = useAddDatabaseRow(database.id);
  const { mutate: updateRow } = useUpdateDatabaseRow(database.id);
  const [newRowTitle, setNewRowTitle] = useState('');

  const handleAddNewRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowTitle.trim()) return;

    addRow({
      'p-title': newRowTitle.trim(),
      'p-status': 'Backlog',
      'p-priority': 'Medium',
      'p-due': new Date().toISOString().split('T')[0],
    });

    setNewRowTitle('');
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/80 bg-card/40 shadow-xl backdrop-blur-md">
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        {/* Table Headers */}
        <thead>
          <tr className="border-b border-border/70 bg-secondary/40 text-muted-foreground font-semibold">
            {database.properties.map((prop) => (
              <th key={prop.id} className="py-3 px-4 min-w-[150px]">
                <div className="flex items-center gap-1.5">
                  {prop.type === 'select' && <Tag className="w-3.5 h-3.5 text-indigo-400" />}
                  {prop.type === 'date' && <Calendar className="w-3.5 h-3.5 text-amber-400" />}
                  {prop.type === 'text' && <span className="font-mono text-xs">Aa</span>}
                  <span>{prop.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Rows */}
        <tbody className="divide-y divide-border/40">
          {database.rows.map((row) => (
            <tr key={row.id} className="hover:bg-secondary/30 transition-colors group">
              {/* Title Cell */}
              <td className="py-2.5 px-4 font-medium text-foreground">
                <input
                  type="text"
                  value={row.properties['p-title'] || ''}
                  onChange={(e) =>
                    updateRow({
                      rowId: row.id,
                      properties: { 'p-title': e.target.value },
                    })
                  }
                  className="bg-transparent border-none outline-none w-full text-foreground focus:bg-secondary/60 px-1 py-0.5 rounded"
                />
              </td>

              {/* Status Cell */}
              <td className="py-2.5 px-4">
                <select
                  value={row.properties['p-status'] || 'Backlog'}
                  onChange={(e) =>
                    updateRow({
                      rowId: row.id,
                      properties: { 'p-status': e.target.value },
                    })
                  }
                  className="bg-secondary/80 border border-border/60 text-xs font-semibold rounded-lg px-2.5 py-1 text-indigo-300 outline-none cursor-pointer"
                >
                  <option value="Backlog">Backlog</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </td>

              {/* Priority Cell */}
              <td className="py-2.5 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                    row.properties['p-priority'] === 'High'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : row.properties['p-priority'] === 'Medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {row.properties['p-priority'] || 'Medium'}
                </span>
              </td>

              {/* Due Date Cell */}
              <td className="py-2.5 px-4 text-muted-foreground text-xs font-mono">
                {row.properties['p-due'] || '—'}
              </td>
            </tr>
          ))}

          {/* Quick Add Row */}
          <tr>
            <td colSpan={database.properties.length} className="p-2 bg-secondary/10">
              <form onSubmit={handleAddNewRow} className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground ml-2" />
                <input
                  type="text"
                  value={newRowTitle}
                  onChange={(e) => setNewRowTitle(e.target.value)}
                  placeholder="Add a new row / task..."
                  className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 w-full py-1.5"
                />
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
