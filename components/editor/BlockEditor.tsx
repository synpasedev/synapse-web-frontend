'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { wrappingInputRule } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

import { WikiLinkExtension } from './extensions/wiki-link';
import { WikiLinkSuggestionExtension } from './extensions/wiki-link-suggestion';
import { SlashCommandExtension } from './extensions/slash-command';
import { BacklinksPanel } from './BacklinksPanel';
import { AIAssistantBar } from './AIAssistantBar';
import { useMutateBlocks } from '@/hooks/use-blocks';
import { useUpdateNote } from '@/hooks/use-notes';
import { Block, Note } from '@/types/domain';
import { extractLinksFromEditor } from '@/lib/editor-link-extractor';
import { blocksToTipTapDoc, tipTapDocToBlocks } from '@/lib/editor-schema';
import { markdownToHTML, isMarkdown } from '@/lib/markdown';
import { GoogleDocSyncBadge } from '@/components/sync/GoogleDocSyncBadge';
import { useGoogleSync } from '@/hooks/use-google-sync';
import { ShareButton } from '@/components/share/ShareButton';
import { Star, Clock, Layers, Users } from 'lucide-react';

const lowlight = createLowlight(common);

// Matches `[] `, `[ ] `, `[x] `, `[X] `, `- [] `, `- [ ] `, `- [x] `, `* [] `, etc.
const taskItemInputRegex = /^\s*(?:[-*]\s+)?\[([ xX]?)\]\s$/;

const CustomTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: taskItemInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          checked: match[1]?.toLowerCase() === 'x',
        }),
      }),
    ];
  },
});

interface BlockEditorProps {
  note: Note;
  initialBlocks: Block[];
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ note, initialBlocks }) => {
  const { mutate: saveBlocks } = useMutateBlocks(note.id);
  const { mutate: updateNote } = useUpdateNote();

  const [title, setTitle] = useState(note.title || '');
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(note.title || '');
  }, [note.id, note.title]);

  const blocksRef = useRef<Block[]>(initialBlocks);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onUserEditRef = useRef<() => void>(() => {});
  const editorRef = useRef<any>(null);
  const draftKey = useMemo(() => `synapse_draft_${note.id}`, [note.id]);

  useEffect(() => {
    blocksRef.current = initialBlocks;
    if (editorRef.current && !editorRef.current.isFocused && !debounceTimerRef.current && initialBlocks && initialBlocks.length > 0) {
      const newDoc = blocksToTipTapDoc(initialBlocks);
      const currentDoc = editorRef.current.getJSON();
      if (JSON.stringify(newDoc) !== JSON.stringify(currentDoc)) {
        editorRef.current.commands.setContent(newDoc, { emitUpdate: false });
      }
    }
  }, [initialBlocks]);

  // Compute initial document content: check synchronous local draft first, fallback to initialBlocks
  const initialContent = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.type === 'doc' && Array.isArray(parsed.content)) {
            return parsed;
          }
        }
      } catch (e) {
        // Fallback to initialBlocks if draft parsing fails
      }
    }
    return blocksToTipTapDoc(initialBlocks);
  }, [initialBlocks, draftKey]);

  // Immediate synchronous flush for unmount / tab close
  const flushPendingSave = useCallback(() => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
      updateNote({
        id: note.id,
        updates: { title },
      });
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (editorRef.current) {
      const json = editorRef.current.getJSON();
      // 1. Synchronously commit draft to localStorage
      try {
        localStorage.setItem(draftKey, JSON.stringify(json));
      } catch (e) {}

      // 2. Persist to IndexedDB
      const blocks = tipTapDocToBlocks(json, note, blocksRef.current);
      blocksRef.current = blocks;
      saveBlocks(blocks);
      extractLinksFromEditor(note.workspace_id, note.id, json);
    }
  }, [note, saveBlocks, updateNote, title, draftKey]);

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      editorRef.current = editor;
      const json = editor.getJSON();

      // 1. Synchronous 0ms local disk buffer (survives sudden browser close/power loss)
      try {
        localStorage.setItem(draftKey, JSON.stringify(json));
      } catch (e) {}

      // 2. Debounced IndexedDB & Sync Engine commit
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const blocks = tipTapDocToBlocks(json, note, blocksRef.current);
        blocksRef.current = blocks;

        saveBlocks(blocks);
        extractLinksFromEditor(note.workspace_id, note.id, json);
        onUserEditRef.current();
      }, 150);
    },
    [note, saveBlocks, draftKey]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands or '[[' to link notes...",
      }),
      WikiLinkExtension,
      WikiLinkSuggestionExtension.configure({
        workspaceId: note.workspace_id,
      }),
      SlashCommandExtension,
    ],
    content: initialContent,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none text-foreground leading-relaxed',
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        if (isMarkdown(text)) {
          event.preventDefault();
          const html = markdownToHTML(text);
          if (editorRef.current) {
            editorRef.current.commands.insertContent(html);
          }
          return true;
        }

        return false;
      },
    },
  });

  const googleSync = useGoogleSync(note, editor);
  useEffect(() => {
    onUserEditRef.current = googleSync.onUserEdit;
  }, [googleSync.onUserEdit]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Synchronous flush on page exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }

    titleDebounceRef.current = setTimeout(() => {
      titleDebounceRef.current = null;
      updateNote({
        id: note.id,
        updates: { title: newTitle },
      });
      onUserEditRef.current();
    }, 250);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
      updateNote({
        id: note.id,
        updates: { title },
      });
      onUserEditRef.current();
    }
  };

  const handleToggleFavorite = () => {
    updateNote({
      id: note.id,
      updates: { is_favorite: !note.is_favorite },
    });
  };

  const handleIconChange = (newIcon: string) => {
    updateNote({
      id: note.id,
      updates: { icon: newIcon },
    });
  };

  const getFullText = useCallback(() => {
    return editor?.getText() || '';
  }, [editor]);

  const handleInsertAIContent = useCallback(
    (content: string) => {
      if (!editor) return;
      const html = markdownToHTML(content);
      editor.chain().focus().insertContent(html).run();
    },
    [editor]
  );

  const wordCount = useMemo(() => {
    const text = editor?.getText() || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [editor?.getText()]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pt-14 sm:pt-10">
      {/* Note Header */}
      <div className="mb-6 group">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const emojis = ['📄', '🧠', '⚡', '🚀', '💡', '🛠️', '🎯', '📚', '🌟', '🔮'];
                const next = emojis[(emojis.indexOf(note.icon || '📄') + 1) % emojis.length];
                handleIconChange(next);
              }}
              className="text-2xl hover:scale-105 transition-transform cursor-pointer p-1 rounded-lg hover:bg-secondary/50"
              title="Click to change icon"
            >
              {note.icon || '📄'}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <span className="flex items-center gap-1" suppressHydrationWarning>
                <Clock className="w-3 h-3" />
                {new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {wordCount} words
              </span>
              {note.author_name && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span
                    className="flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-medium"
                    title={`Author/Editor: ${note.author_name}${note.author_email ? ` (${note.author_email})` : ''}`}
                  >
                    <Users className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{note.author_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <GoogleDocSyncBadge
                noteId={note.id}
                workspaceId={note.workspace_id}
                noteTitle={note.title}
                link={googleSync.link}
                isSyncing={googleSync.isSyncing}
                onForceSync={() => googleSync.performSync(false)}
                onRefreshLink={googleSync.refreshLink}
              />
            </div>

            <ShareButton
              resourceType="note"
              resourceId={note.id}
              resourceTitle={note.title}
              resourceIcon={note.icon || '📄'}
            />

            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg border border-border/50 hover:bg-secondary/60 transition-colors cursor-pointer ${
                note.is_favorite ? 'text-amber-400/90 bg-amber-400/10' : 'text-muted-foreground/70'
              }`}
              title={note.is_favorite ? 'Favorited' : 'Add to favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${note.is_favorite ? 'fill-amber-400/90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Note Title Input */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="Untitled Note"
          className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 tracking-tight cursor-text focus:ring-0"
        />
      </div>

      {/* AI Assistant Bar */}
      <AIAssistantBar
        getNoteContent={getFullText}
        onInsertContent={handleInsertAIContent}
      />

      {/* TipTap Rich Editor */}
      <div className="min-h-[420px] py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Incoming Backlinks Inspector */}
      <BacklinksPanel noteId={note.id} />
    </div>
  );
};
