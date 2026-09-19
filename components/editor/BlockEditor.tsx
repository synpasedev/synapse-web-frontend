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
import { CalloutExtension } from './extensions/callout';
import { MathExtension } from './extensions/math';
import { MermaidExtension } from './extensions/mermaid';
import { TableOfContents } from './TableOfContents';
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
import { useUIStore } from '@/stores/use-ui-store';
import { synapseRealtime, RealtimeEvent, ActiveEditorPresence } from '@/lib/realtime/ws-client';
import { Star, Clock, Layers, Users, LayoutTemplate, AlertTriangle, ShieldAlert, ArrowDown } from 'lucide-react';

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

function getCurrentBlockIndex(ed: any): number {
  if (!ed || !ed.state || !ed.state.selection) return 0;
  try {
    const { selection } = ed.state;
    return selection.$from ? selection.$from.index(0) : 0;
  } catch {
    return 0;
  }
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ note, initialBlocks }) => {
  const { setTemplateModalOpen } = useUIStore();
  const { mutate: saveBlocks } = useMutateBlocks(note.id);
  const { mutate: updateNote } = useUpdateNote();

  const [title, setTitle] = useState(note.title || '');
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const titleRef = useRef(note.title || '');
  const noteRef = useRef(note);

  // Active presence & collision guard state
  const [activeCollisions, setActiveCollisions] = useState<Map<number, any[]>>(new Map());
  const [activeEditors, setActiveEditors] = useState<ActiveEditorPresence[]>([]);
  const lastPresenceSentRef = useRef<{ time: number; blockIdx: number }>({ time: 0, blockIdx: -1 });
  const currentBlockIndexRef = useRef<number>(-1);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    setTitle(note.title || '');
    titleRef.current = note.title || '';
  }, [note.id, note.title]);

  const blocksRef = useRef<Block[]>(initialBlocks);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onUserEditRef = useRef<() => void>(() => {});
  const editorRef = useRef<any>(null);
  const draftKey = useMemo(() => `synapse_draft_${note.id}`, [note.id]);

  // Presence broadcaster: throttled to avoid flooding, broadcasts block movements & typing
  const emitPresence = useCallback((blockIdx: number, isTyping: boolean = false) => {
    currentBlockIndexRef.current = blockIdx;
    const now = Date.now();
    const last = lastPresenceSentRef.current;
    if (now - last.time > 400 || blockIdx !== last.blockIdx || isTyping) {
      lastPresenceSentRef.current = { time: now, blockIdx };
      const activeBlockId = blocksRef.current[blockIdx]?.id;
      synapseRealtime.sendPresenceEditing(note.workspace_id, note.id, blockIdx, activeBlockId, isTyping);
    }
  }, [note.workspace_id, note.id]);

  // Synchronize remote blocks into TipTap editor without losing focus or resetting cursor
  const handleRemoteBlocks = useCallback((remoteBlocks: Block[]) => {
    if (!editorRef.current || !remoteBlocks || remoteBlocks.length === 0) return;
    const editor = editorRef.current;
    const isFocused = editor.isFocused;
    const currentBlockIdx = getCurrentBlockIndex(editor);
    const isActivelyTyping = Boolean(debounceTimerRef.current);

    // If the user is actively typing in a block:
    if (isFocused && isActivelyTyping) {
      // Guard the user's active block so their words are never overwritten
      const localJson = editor.getJSON();
      const localNodes = localJson.content || [];
      const remoteDoc = blocksToTipTapDoc(remoteBlocks);
      const remoteNodes = remoteDoc.content || [];

      // Merge: preserve local block at currentBlockIdx, update all other blocks from remote
      const mergedNodes = remoteNodes.map((rNode: any, idx: number) => {
        if (idx === currentBlockIdx && localNodes[idx]) {
          return localNodes[idx]; // Preserve local active paragraph
        }
        return rNode;
      });

      const mergedDoc = { type: 'doc', content: mergedNodes };
      if (JSON.stringify(mergedDoc) !== JSON.stringify(localJson)) {
        const { from, to } = editor.state.selection;
        editor.commands.setContent(mergedDoc, { emitUpdate: false });
        try {
          const docSize = editor.state.doc.content.size;
          editor.commands.setTextSelection({
            from: Math.max(0, Math.min(from, docSize)),
            to: Math.max(0, Math.min(to, docSize)),
          });
        } catch {}
      }
      return;
    }

    // User is idle or reading: apply remote blocks cleanly while preserving cursor position
    const newDoc = blocksToTipTapDoc(remoteBlocks);
    const currentDoc = editor.getJSON();
    if (JSON.stringify(newDoc) !== JSON.stringify(currentDoc)) {
      blocksRef.current = remoteBlocks;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(newDoc, { emitUpdate: false });
      if (isFocused) {
        try {
          const docSize = editor.state.doc.content.size;
          editor.commands.setTextSelection({
            from: Math.max(0, Math.min(from, docSize)),
            to: Math.max(0, Math.min(to, docSize)),
          });
        } catch {}
      }
    }
  }, []);

  // Direct Note-Level Real-Time WebSocket Subscription
  useEffect(() => {
    // Join note room
    synapseRealtime.joinNote(note.workspace_id, note.id);

    const unsubscribe = synapseRealtime.subscribeToNote(note.id, (event: RealtimeEvent) => {
      switch (event.type) {
        case 'BLOCKS_UPDATED': {
          if (event.blocks && event.blocks.length > 0) {
            handleRemoteBlocks(event.blocks);
          }
          break;
        }

        case 'COLLISION_ALERT': {
          if (typeof event.activeBlockIndex === 'number' && Array.isArray(event.users)) {
            setActiveCollisions((prev) => {
              const next = new Map(prev);
              next.set(event.activeBlockIndex!, event.users!);
              return next;
            });
          }
          break;
        }

        case 'COLLISION_CLEAR': {
          if (typeof event.activeBlockIndex === 'number') {
            setActiveCollisions((prev) => {
              const next = new Map(prev);
              next.delete(event.activeBlockIndex!);
              return next;
            });
          }
          break;
        }

        case 'PRESENCE_UPDATED': {
          if (Array.isArray(event.activeEditors)) {
            setActiveEditors(event.activeEditors);
          }
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      synapseRealtime.leaveNote(note.workspace_id, note.id);
    };
  }, [note.id, note.workspace_id, handleRemoteBlocks]);

  // Synchronize initialBlocks on props change (e.g. navigation or refetch)
  useEffect(() => {
    blocksRef.current = initialBlocks;
    if (editorRef.current && !debounceTimerRef.current && initialBlocks && initialBlocks.length > 0) {
      const isFocused = editorRef.current.isFocused;
      const newDoc = blocksToTipTapDoc(initialBlocks);
      const currentDoc = editorRef.current.getJSON();
      if (JSON.stringify(newDoc) !== JSON.stringify(currentDoc)) {
        const { from, to } = editorRef.current.state.selection;
        editorRef.current.commands.setContent(newDoc, { emitUpdate: false });
        if (isFocused) {
          try {
            const docSize = editorRef.current.state.doc.content.size;
            editorRef.current.commands.setTextSelection({
              from: Math.max(0, Math.min(from, docSize)),
              to: Math.max(0, Math.min(to, docSize)),
            });
          } catch {}
        }
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
      } catch (e) {}
    }
    return blocksToTipTapDoc(initialBlocks);
  }, [initialBlocks, draftKey]);

  // Immediate synchronous flush for unmount / tab close
  const flushPendingSave = useCallback(() => {
    const currentNote = noteRef.current;
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
      updateNote({
        id: currentNote.id,
        updates: { title: titleRef.current },
      });
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (editorRef.current) {
      const json = editorRef.current.getJSON();
      try {
        localStorage.setItem(draftKey, JSON.stringify(json));
      } catch (e) {}

      const blocks = tipTapDocToBlocks(json, currentNote, blocksRef.current);
      blocksRef.current = blocks;
      saveBlocks(blocks);
      extractLinksFromEditor(currentNote.workspace_id, currentNote.id, json);
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}
    }
  }, [saveBlocks, updateNote, draftKey]);

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      editorRef.current = editor;
      const json = editor.getJSON();

      // 1. Synchronous 0ms local disk buffer
      try {
        localStorage.setItem(draftKey, JSON.stringify(json));
      } catch (e) {}

      // 2. Debounced save to IndexedDB & sync engine (80ms for ultra responsiveness)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const blocks = tipTapDocToBlocks(json, note, blocksRef.current);
        blocksRef.current = blocks;

        saveBlocks(blocks);
        extractLinksFromEditor(note.workspace_id, note.id, json);
        try {
          localStorage.removeItem(draftKey);
        } catch (e) {}
        onUserEditRef.current();
      }, 80);
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
      CalloutExtension,
      MathExtension,
      MermaidExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      handleUpdate({ editor });
      const blockIdx = getCurrentBlockIndex(editor);
      emitPresence(blockIdx, true);
    },
    onSelectionUpdate: ({ editor }) => {
      const blockIdx = getCurrentBlockIndex(editor);
      emitPresence(blockIdx, false);
    },
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
    titleRef.current = newTitle;

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
    }, 200);
  };

  const handleTitleBlur = (e?: React.FocusEvent<HTMLInputElement>) => {
    const finalTitle = e?.target ? e.target.value : titleRef.current;
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    updateNote({
      id: note.id,
      updates: { title: finalTitle },
    });
    onUserEditRef.current();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
        titleDebounceRef.current = null;
        updateNote({
          id: note.id,
          updates: { title: titleRef.current },
        });
        onUserEditRef.current();
      }
      editor?.commands.focus('start');
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

  // Filter out self from active editors if desired, or show all
  const otherEditors = useMemo(() => {
    return activeEditors.filter((e) => e.activeBlockIndex >= 0);
  }, [activeEditors]);

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
              onClick={() => setTemplateModalOpen(true, { targetNoteId: note.id })}
              className="p-2 rounded-lg border border-border/50 hover:bg-secondary/60 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
              title="Apply Blueprint or Template to this note"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
            </button>

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
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled Note"
          className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 tracking-tight cursor-text focus:ring-0"
        />

        {/* Live Collaborators Presence Badges (>2 users support) */}
        {otherEditors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap animate-in fade-in duration-200">
            <span className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Collaborators live:
            </span>
            {otherEditors.map((e, idx) => (
              <span
                key={`collab-${idx}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                title={`${e.user.name || 'User'} is currently at paragraph ${e.activeBlockIndex + 1}`}
              >
                <span>{e.user.name || 'Collaborator'}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 font-mono text-emerald-300">
                  ¶{e.activeBlockIndex + 1}
                </span>
                {e.isTyping && <span className="text-[10px] animate-pulse">✎</span>}
              </span>
            ))}
          </div>
        )}

        {/* Empty Note Template Quick Prompt (Notion-style) */}
        {(!editor || editor.isEmpty) && (
          <div className="flex items-center gap-2 mt-2 mb-1 text-xs text-muted-foreground animate-in fade-in duration-150">
            <span className="text-[11px] font-medium text-muted-foreground/70">Empty note:</span>
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true, { targetNoteId: note.id })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium transition-colors cursor-pointer border border-indigo-500/20 text-xs"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Choose a Template Blueprint</span>
            </button>
          </div>
        )}
      </div>

      {/* Simultaneous Edit Collision Guard Warning Banner */}
      {activeCollisions.size > 0 && (
        <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {Array.from(activeCollisions.entries()).map(([blockIdx, users]) => {
            const userNames = users.map((u) => u.name || u.email || 'Collaborator').join(', ');
            return (
              <div
                key={`collision-${blockIdx}`}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-lg shadow-amber-500/5"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="text-xs sm:text-sm">
                    <div className="font-semibold flex items-center gap-2">
                      <span>Simultaneous Edit Warning</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono font-bold">
                        Paragraph {blockIdx + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      Multiple users (<strong>{userNames}</strong>) are editing <strong>Paragraph {blockIdx + 1}</strong> at the same time. To avoid overwriting each other&apos;s words or characters, please coordinate or write in separate paragraphs.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (editor) {
                      editor.commands.focus('end');
                    }
                  }}
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-medium transition-colors cursor-pointer border border-amber-500/30"
                  title="Move cursor to the end of the note to start a new paragraph"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Jump to end</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Floating Table of Contents Outline */}
      <TableOfContents editor={editor} />
    </div>
  );
};
