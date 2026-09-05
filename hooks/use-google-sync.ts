'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { localDb } from '@/lib/dexie/db';
import { Block, Note } from '@/types/domain';
import { blocksToTipTapDoc } from '@/lib/editor-schema';

export interface GoogleDocLinkInfo {
  id: string;
  google_doc_id: string;
  google_doc_title: string;
  status: 'synced' | 'syncing' | 'conflict' | 'error' | 'paused';
  last_synced_at: string;
  error_message?: string;
}

export function useGoogleSync(note: Note, editor: any) {
  const [link, setLink] = useState<GoogleDocLinkInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const linkRef = useRef<GoogleDocLinkInfo | null>(null);
  const autoSyncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const isRemoteUpdatingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    linkRef.current = link;
  }, [link]);

  // 1. Fetch current link status
  const fetchLink = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/google/sync?noteId=${note.id}`);
      const data = await res.json();
      if (res.ok && data.linked) {
        setLink(data.link);
        linkRef.current = data.link;
        return data.link;
      } else {
        setLink(null);
        linkRef.current = null;
        return null;
      }
    } catch (err) {
      console.error('Failed to load link:', err);
      return null;
    }
  }, [note.id]);

  useEffect(() => {
    fetchLink();
  }, [fetchLink]);

  // 2. Perform sync operation
  const performSync = useCallback(
    async (silent = false) => {
      if (isSyncing || Date.now() - lastSyncTimeRef.current < 2000) return;
      lastSyncTimeRef.current = Date.now();

      if (!silent) setIsSyncing(true);

      try {
        const localNote = await localDb.notes.get(note.id);
        const localBlocks = await localDb.blocks
          .where('note_id')
          .equals(note.id)
          .sortBy('sort_order');

        const res = await fetch('/api/integrations/google/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            noteId: note.id,
            workspaceId: note.workspace_id,
            clientNote: localNote || note,
            clientBlocks: localBlocks || [],
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // If Google Docs had newer changes, update local Dexie and editor content
          if (data.updatedBlocks && data.updatedBlocks.length > 0) {
            await localDb.notes.update(note.id, {
              title: data.updatedTitle || note.title,
              updated_at: new Date().toISOString(),
            });

            await localDb.blocks.where('note_id').equals(note.id).delete();
            const savedBlocks: Block[] = [];
            for (const b of data.updatedBlocks) {
              const blk: Block = {
                id: b.id || crypto.randomUUID(),
                note_id: note.id,
                workspace_id: note.workspace_id,
                parent_block_id: null,
                type: b.type || 'paragraph',
                content: b.content || { text: '' },
                properties: b.properties || {},
                sort_order: b.sort_order || 1000,
                created_by: note.created_by || 'local-user',
                updated_by: note.updated_by || 'local-user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
              };
              await localDb.blocks.put(blk);
              savedBlocks.push(blk);
            }

            // Live update the TipTap editor content without triggering circular onUpdate
            if (editor && !isTypingRef.current) {
              isRemoteUpdatingRef.current = true;
              editor.commands.setContent(blocksToTipTapDoc(savedBlocks), false);
              setTimeout(() => {
                isRemoteUpdatingRef.current = false;
              }, 400);
            }
          }
          await fetchLink();
        }
      } catch (err) {
        console.error('Google sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [note, editor, isSyncing, fetchLink]
  );

  // 3. Debounced Auto-Sync when user edits in Synapse
  const onUserEdit = useCallback(() => {
    if (isRemoteUpdatingRef.current) return;
    isTypingRef.current = true;
    if (autoSyncDebounceRef.current) {
      clearTimeout(autoSyncDebounceRef.current);
    }

    autoSyncDebounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (linkRef.current) {
        performSync(false);
      }
    }, 2500); // 2.5 second debounce
  }, [performSync]);

  // 4. Auto-Pull on Window Focus and periodic poll
  useEffect(() => {
    if (!link) return;

    const onFocus = () => {
      if (!isTypingRef.current && !isRemoteUpdatingRef.current) {
        performSync(true);
      }
    };

    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => {
      if (!isTypingRef.current && !isRemoteUpdatingRef.current && document.visibilityState === 'visible') {
        performSync(true);
      }
    }, 12000); // 12-second background check

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [link, performSync]);

  return {
    link,
    isSyncing,
    performSync,
    onUserEdit,
    refreshLink: fetchLink,
    isRemoteUpdating: () => isRemoteUpdatingRef.current,
  };
}
