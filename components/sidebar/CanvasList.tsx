'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Whiteboard } from '@/types/domain';
import { useDeleteWhiteboard } from '@/hooks/use-whiteboard';
import { Trash2 } from 'lucide-react';

interface CanvasListProps {
  whiteboards: Whiteboard[];
  workspaceId: string;
}

export const CanvasList: React.FC<CanvasListProps> = ({ whiteboards, workspaceId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate: deleteWhiteboard } = useDeleteWhiteboard();

  const handleDelete = (wbId: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete canvas "${title}"?`)) {
      deleteWhiteboard(wbId, {
        onSuccess: () => {
          if (pathname === `/${workspaceId}/canvas/${wbId}`) {
            router.push(`/${workspaceId}/canvas`);
          }
        },
      });
    }
  };

  if (!whiteboards.length) {
    return (
      <div className="px-3 py-2 text-center text-xs text-muted-foreground">
        No canvases yet.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      {whiteboards.map((wb) => {
        const isActive = pathname === `/${workspaceId}/canvas/${wb.id}`;

        return (
          <Link
            key={wb.id}
            href={`/${workspaceId}/canvas/${wb.id}`}
            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-pink-500/15 text-pink-300 font-semibold border border-pink-500/20'
                : 'text-foreground/80 hover:bg-secondary/60 hover:text-foreground border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{wb.icon || '🎨'}</span>
              <span className="truncate">{wb.title || 'Untitled Canvas'}</span>
            </div>

            {/* Delete icon on hover */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleDelete(wb.id, wb.title, e)}
                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-destructive cursor-pointer"
                title="Delete canvas"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
