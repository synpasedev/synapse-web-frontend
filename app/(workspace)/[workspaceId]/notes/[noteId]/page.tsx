'use client';

import React, { use } from 'react';
import { useNote } from '@/hooks/use-notes';
import { useBlocks } from '@/hooks/use-blocks';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { Loader2 } from 'lucide-react';

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; noteId: string }>;
}) {
  const { workspaceId, noteId } = use(params);
  const { data: note, isLoading: isNoteLoading } = useNote(noteId);
  const { data: blocks, isLoading: isBlocksLoading } = useBlocks(noteId);

  if (isNoteLoading || isBlocksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-foreground mb-1">Note not found</h2>
        <p className="text-sm text-muted-foreground">
          This note may have been deleted or archived.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <BlockEditor key={note.id} note={note} initialBlocks={blocks || []} />
    </div>
  );
}
