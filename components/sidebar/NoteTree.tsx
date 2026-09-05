'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Note } from '@/types/domain';
import { useCreateNote, useDeleteNote } from '@/hooks/use-notes';
import { FileText, Plus, Trash2, Star, MoreHorizontal } from 'lucide-react';

interface NoteTreeProps {
  notes: Note[];
  workspaceId: string;
}

export const NoteTree: React.FC<NoteTreeProps> = ({ notes, workspaceId }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutateAsync: createNote } = useCreateNote();
  const { mutate: deleteNote } = useDeleteNote();

  const handleCreateSubNote = async (parentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const note = await createNote({
      workspaceId,
      title: 'Untitled Note',
      parentId,
    });
    router.push(`/${workspaceId}/notes/${note.id}`);
  };

  const handleDelete = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Move note to trash?')) {
      deleteNote({ noteId, workspaceId });
    }
  };

  if (!notes.length) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        No notes yet. Create one!
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      {notes.map((note) => {
        const isActive = pathname === `/${workspaceId}/notes/${note.id}`;

        return (
          <Link
            key={note.id}
            href={`/${workspaceId}/notes/${note.id}`}
            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/20'
                : 'text-foreground/80 hover:bg-secondary/60 hover:text-foreground border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{note.icon || '📄'}</span>
              <span className="truncate">{note.title || 'Untitled Note'}</span>
            </div>

            {/* Quick Action icons on Hover */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleCreateSubNote(note.id, e)}
                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                title="Add Sub-note"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(note.id, e)}
                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-destructive cursor-pointer"
                title="Delete note"
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
