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
  baseRoute?: 'canvas' | 'whiteboards';
  emptyText?: string;
}

export const CanvasList: React.FC<CanvasListProps> = ({
  whiteboards,
  workspaceId,
  baseRoute = 'canvas',
  emptyText,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate: deleteWhiteboard } = useDeleteWhiteboard();

  const handleDelete = (wbId: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${title}"?`)) {
      deleteWhiteboard(wbId, {
        onSuccess: () => {
          if (pathname === `/${workspaceId}/${baseRoute}/${wbId}`) {
            router.push(`/${workspaceId}/${baseRoute}`);
          }
        },
      });
    }
  };

  if (!whiteboards.length) {
    return (
      <div className="px-3 py-2 text-center text-xs text-muted-foreground/70 italic">
        {emptyText || `No ${baseRoute === 'whiteboards' ? 'whiteboards' : 'canvases'} yet.`}
      </div>
    );
  }

  const isWhiteboardMode = baseRoute === 'whiteboards';

  return (
    <div className="space-y-0.5 px-1.5">
      {whiteboards.map((wb) => {
        const isActive = pathname === `/${workspaceId}/${baseRoute}/${wb.id}`;

        return (
          <Link
            key={wb.id}
            href={`/${workspaceId}/${baseRoute}/${wb.id}`}
            className={`group flex items-center justify-between px-2 py-1 rounded-md text-[13px] transition-colors ${
              isActive
                ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0 leading-none">{wb.icon || (isWhiteboardMode ? '📋' : '🎨')}</span>
              <span className="truncate">{wb.title || 'Untitled Board'}</span>
            </div>

            {/* Delete icon on hover */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleDelete(wb.id, wb.title, e)}
                className="p-0.5 rounded hover:bg-secondary/80 text-muted-foreground/70 hover:text-rose-400 cursor-pointer transition-colors"
                title={`Delete ${isWhiteboardMode ? 'whiteboard' : 'canvas'}`}
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
