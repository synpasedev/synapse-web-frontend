'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Note } from '@/types/domain';
import { useCreateNote, useDeleteNote } from '@/hooks/use-notes';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface NoteTreeProps {
  notes: Note[];
  workspaceId: string;
  searchQuery?: string;
}

interface NoteItemProps {
  note: Note;
  workspaceId: string;
  depth: number;
  childrenMap: Map<string, Note[]>;
  expandedNotes: Set<string>;
  toggleExpanded: (id: string, e: React.MouseEvent) => void;
  onAddSubNote: (parentId: string, e: React.MouseEvent) => void;
  onDelete: (noteId: string, e: React.MouseEvent) => void;
  pathname: string;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  workspaceId,
  depth,
  childrenMap,
  expandedNotes,
  toggleExpanded,
  onAddSubNote,
  onDelete,
  pathname,
}) => {
  const children = childrenMap.get(note.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedNotes.has(note.id);
  const isActive = pathname === `/${workspaceId}/notes/${note.id}`;

  return (
    <div className="flex flex-col">
      <div
        className={`group flex items-center justify-between px-2 py-1 rounded-md text-[13px] transition-colors ${
          isActive
            ? 'bg-neutral-200/80 dark:bg-white/[0.08] text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-white/[0.05] font-normal'
        }`}
        style={{ paddingLeft: `${Math.max(6, depth * 12 + 6)}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Expand/Collapse Chevron for parent notes */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpanded(note.id, e)}
              className="p-0.5 -ml-1 rounded hover:bg-secondary/60 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse sub-notes' : 'Expand sub-notes'}
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-150 ${
                  isExpanded ? 'rotate-90 text-foreground' : 'text-muted-foreground/70'
                }`}
              />
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          <Link
            href={`/${workspaceId}/notes/${note.id}`}
            title={note.title || 'Untitled Note'}
            className="flex items-center gap-1.5 min-w-0 flex-1 truncate py-0.5"
          >
            <span className="text-sm shrink-0 leading-none">{note.icon || '📄'}</span>
            <span className="truncate">{note.title || 'Untitled Note'}</span>
          </Link>
        </div>

        {/* Quick Action icons on Hover (Notion-style) */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0 ml-1">
          <button
            type="button"
            onClick={(e) => onAddSubNote(note.id, e)}
            className="p-1 rounded hover:bg-secondary/80 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            title="Add Sub-note"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(note.id, e)}
            className="p-1 rounded hover:bg-secondary/80 text-muted-foreground/70 hover:text-destructive transition-colors cursor-pointer"
            title="Delete note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Render Sub-notes when expanded */}
      {hasChildren && isExpanded && (
        <div className="relative pl-1 border-l border-border/25 ml-3.5 space-y-0.5">
          {children.map((child) => (
            <NoteItem
              key={child.id}
              note={child}
              workspaceId={workspaceId}
              depth={depth + 1}
              childrenMap={childrenMap}
              expandedNotes={expandedNotes}
              toggleExpanded={toggleExpanded}
              onAddSubNote={onAddSubNote}
              onDelete={onDelete}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NoteTree: React.FC<NoteTreeProps> = ({ notes, workspaceId, searchQuery = '' }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutateAsync: createNote } = useCreateNote();
  const { mutate: deleteNote } = useDeleteNote();

  // Filter notes if search query is present
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase().trim();
    return notes.filter((n) => (n.title || 'Untitled Note').toLowerCase().includes(query));
  }, [notes, searchQuery]);

  // Build tree data structure
  const { rootNotes, childrenMap } = useMemo(() => {
    const map = new Map<string, Note[]>();
    const roots: Note[] = [];
    const noteIdSet = new Set(filteredNotes.map((n) => n.id));

    filteredNotes.forEach((note) => {
      if (note.parent_id && noteIdSet.has(note.parent_id) && !searchQuery.trim()) {
        const existing = map.get(note.parent_id) || [];
        existing.push(note);
        map.set(note.parent_id, existing);
      } else {
        roots.push(note);
      }
    });

    return { rootNotes: roots, childrenMap: map };
  }, [filteredNotes, searchQuery]);

  // Track expanded state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());

  // Auto-expand parent if currently viewing a child note
  useEffect(() => {
    const activeNoteId = pathname?.split('/notes/')[1];
    if (!activeNoteId) return;

    const findAncestors = (childId: string): string[] => {
      const parent = notes.find((n) => n.id === childId)?.parent_id;
      if (!parent) return [];
      return [parent, ...findAncestors(parent)];
    };

    const ancestors = findAncestors(activeNoteId);
    if (ancestors.length > 0) {
      setExpandedNotes((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [pathname, notes]);

  const toggleExpanded = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleCreateSubNote = async (parentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const note = await createNote({
      workspaceId,
      title: 'Untitled Note',
      parentId,
    });
    setExpandedNotes((prev) => new Set(prev).add(parentId));
    router.push(`/${workspaceId}/notes/${note.id}`);
  };

  const handleDelete = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Move note to trash?')) {
      deleteNote({ noteId, workspaceId });
      if (pathname === `/${workspaceId}/notes/${noteId}`) {
        router.push(`/${workspaceId}/notes`);
      }
    }
  };

  if (!filteredNotes.length) {
    return (
      <div className="px-3 py-3 text-center text-xs text-muted-foreground/70 italic">
        {searchQuery ? 'No matching notes found' : 'No notes yet. Create one!'}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-1.5">
      {rootNotes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          workspaceId={workspaceId}
          depth={0}
          childrenMap={childrenMap}
          expandedNotes={expandedNotes}
          toggleExpanded={toggleExpanded}
          onAddSubNote={handleCreateSubNote}
          onDelete={handleDelete}
          pathname={pathname}
        />
      ))}
    </div>
  );
};
