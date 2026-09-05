'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Sparkles,
  FileText,
  ArrowRightLeft,
  ChevronRight,
  ArrowLeft,
  Search,
} from 'lucide-react';

export interface SlashContext {
  editor: any;
  range?: { from: number; to: number };
  isSelection?: boolean;
  selection?: { from: number; to: number };
}

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  keywords?: string[];
  icon: React.ReactNode;
  category: 'convert' | 'basic' | 'advanced';
  isConvertMenu?: boolean;
  command: (ctx: SlashContext) => void;
}

// Helper to execute block transformation or insertion
function applyBlockCommand(
  ctx: SlashContext,
  applyFn: (chain: any) => any
) {
  const { editor, range, isSelection, selection } = ctx;
  if (!editor) return;

  if (isSelection && selection) {
    // Selection conversion: restore selection and apply block format
    const chain = editor.chain().focus().setTextSelection(selection);
    applyFn(chain).run();
  } else if (range) {
    // Normal slash command: remove typed "/" and apply format
    const chain = editor.chain().focus().deleteRange(range);
    applyFn(chain).run();
  } else {
    // Direct block format
    const chain = editor.chain().focus();
    applyFn(chain).run();
  }
}

export const CONVERT_BLOCK_ITEMS: SlashItem[] = [
  {
    id: 'convert-h1',
    title: 'Heading 1',
    description: 'Convert to large document heading',
    keywords: ['h1', 'heading', 'title', 'convert', 'large'],
    category: 'convert',
    icon: <Heading1 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 1 })),
  },
  {
    id: 'convert-h2',
    title: 'Heading 2',
    description: 'Convert to medium section heading',
    keywords: ['h2', 'heading', 'section', 'convert', 'medium'],
    category: 'convert',
    icon: <Heading2 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 2 })),
  },
  {
    id: 'convert-h3',
    title: 'Heading 3',
    description: 'Convert to small subsection heading',
    keywords: ['h3', 'heading', 'sub', 'convert', 'small'],
    category: 'convert',
    icon: <Heading3 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 3 })),
  },
  {
    id: 'convert-todo',
    title: 'Checkboxes (To-Do)',
    description: 'Convert to interactive task list with checkboxes',
    keywords: ['checkbox', 'checkboxes', 'check', 'todo', 'task', 'list', 'convert'],
    category: 'convert',
    icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleTaskList()),
  },
  {
    id: 'convert-bullet',
    title: 'Bullet Points',
    description: 'Convert to unordered bullet list',
    keywords: ['bullet', 'points', 'list', 'convert', 'dots'],
    category: 'convert',
    icon: <List className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleBulletList()),
  },
  {
    id: 'convert-ordered',
    title: 'Numbered List',
    description: 'Convert to ordered sequence list',
    keywords: ['number', 'numbered', 'sequence', '123', 'convert', 'list'],
    category: 'convert',
    icon: <ListOrdered className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleOrderedList()),
  },
  {
    id: 'convert-quote',
    title: 'Quote',
    description: 'Convert to standout blockquote',
    keywords: ['quote', 'blockquote', 'callout', 'convert'],
    category: 'convert',
    icon: <Quote className="w-4 h-4 text-purple-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleBlockquote()),
  },
  {
    id: 'convert-code',
    title: 'Code Block',
    description: 'Convert to monospace code snippet',
    keywords: ['code', 'block', 'snippet', 'syntax', 'convert'],
    category: 'convert',
    icon: <Code className="w-4 h-4 text-amber-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleCodeBlock()),
  },
  {
    id: 'convert-paragraph',
    title: 'Plain Text / Paragraph',
    description: 'Convert to standard paragraph text',
    keywords: ['paragraph', 'plain', 'text', 'normal', 'convert'],
    category: 'convert',
    icon: <FileText className="w-4 h-4 text-slate-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setParagraph()),
  },
];

export const SLASH_ITEMS: SlashItem[] = [
  // Top Convert to... menu entry
  {
    id: 'convert-menu-trigger',
    title: 'Convert to...',
    description: 'Turn into H2, checkboxes, bullet points, etc.',
    keywords: ['convert', 'turn', 'change', 'transform', 'format', 'h2', 'checkbox', 'bullet'],
    category: 'convert',
    isConvertMenu: true,
    icon: <ArrowRightLeft className="w-4 h-4 text-sky-400" />,
    command: () => {},
  },

  // Basic Blocks
  {
    id: 'block-h1',
    title: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'heading', 'title', 'large'],
    category: 'basic',
    icon: <Heading1 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 1 })),
  },
  {
    id: 'block-h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'heading', 'section', 'medium'],
    category: 'basic',
    icon: <Heading2 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 2 })),
  },
  {
    id: 'block-h3',
    title: 'Heading 3',
    description: 'Small subsection heading',
    keywords: ['h3', 'heading', 'sub', 'small'],
    category: 'basic',
    icon: <Heading3 className="w-4 h-4 text-indigo-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.setNode('heading', { level: 3 })),
  },
  {
    id: 'block-todo',
    title: 'Checkboxes (To-Do)',
    description: 'Create tasks with interactive checkboxes',
    keywords: ['checkbox', 'checkboxes', 'check', 'todo', 'task', 'list'],
    category: 'basic',
    icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleTaskList()),
  },
  {
    id: 'block-bullet',
    title: 'Bullet Points',
    description: 'Create a simple bulleted list',
    keywords: ['bullet', 'points', 'list', 'dots'],
    category: 'basic',
    icon: <List className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleBulletList()),
  },
  {
    id: 'block-ordered',
    title: 'Numbered List',
    description: 'Create a numbered sequence list',
    keywords: ['number', 'numbered', 'sequence', '123', 'list'],
    category: 'basic',
    icon: <ListOrdered className="w-4 h-4 text-emerald-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleOrderedList()),
  },
  {
    id: 'block-quote',
    title: 'Quote',
    description: 'Capture a standout quote or note',
    keywords: ['quote', 'callout', 'blockquote'],
    category: 'basic',
    icon: <Quote className="w-4 h-4 text-purple-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleBlockquote()),
  },
  {
    id: 'block-code',
    title: 'Code Block',
    description: 'Code snippet with syntax highlighting',
    keywords: ['code', 'block', 'snippet', 'syntax'],
    category: 'basic',
    icon: <Code className="w-4 h-4 text-amber-400" />,
    command: (ctx) => applyBlockCommand(ctx, (c) => c.toggleCodeBlock()),
  },
  {
    id: 'block-divider',
    title: 'Divider',
    description: 'Visually separate content sections',
    keywords: ['divider', 'horizontal', 'rule', 'line', 'hr'],
    category: 'basic',
    icon: <Minus className="w-4 h-4 text-slate-400" />,
    command: (ctx) => {
      if (ctx.range) {
        ctx.editor.chain().focus().deleteRange(ctx.range).setHorizontalRule().run();
      } else {
        ctx.editor.chain().focus().setHorizontalRule().run();
      }
    },
  },
  {
    id: 'block-ai',
    title: 'AI Summary Block',
    description: 'Generate an AI summary of this note',
    keywords: ['ai', 'summary', 'sparkles', 'generate'],
    category: 'advanced',
    icon: <Sparkles className="w-4 h-4 text-pink-400" />,
    command: (ctx) => {
      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '⚡ [Click "AI Summary" in the toolbar above to generate]' }],
      };
      if (ctx.range) {
        ctx.editor.chain().focus().deleteRange(ctx.range).insertContent(content).run();
      } else {
        ctx.editor.chain().focus().insertContent(content).run();
      }
    },
  },
];

export const SlashMenuList = forwardRef((props: any, ref) => {
  // If invoked with selected text, start in 'convert' view directly
  const [viewMode, setViewMode] = useState<'main' | 'convert'>(
    props.isSelection ? 'convert' : 'main'
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [internalQuery, setInternalQuery] = useState('');

  // Determine current active item pool
  const currentItems = useMemo(() => {
    const rawItems: SlashItem[] =
      viewMode === 'convert' || props.isSelection ? CONVERT_BLOCK_ITEMS : (props.items || SLASH_ITEMS);

    const query = (internalQuery || props.query || '').trim().toLowerCase();
    if (!query) return rawItems;

    return rawItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(query));
      return matchTitle || matchDesc || matchKeywords;
    });
  }, [viewMode, props.isSelection, props.items, props.query, internalQuery]);

  const selectItem = (index: number) => {
    const item = currentItems[index];
    if (!item) return;

    // If clicking "Convert to..." drilldown trigger, navigate to convert view
    if (item.isConvertMenu && viewMode === 'main') {
      setViewMode('convert');
      setSelectedIndex(0);
      setInternalQuery('');
      return;
    }

    if (props.command) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [currentItems, viewMode]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + currentItems.length - 1) % Math.max(1, currentItems.length));
        return true;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, currentItems.length));
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      if (event.key === 'Backspace' && viewMode === 'convert' && !props.isSelection && !internalQuery) {
        event.preventDefault();
        setViewMode('main');
        setSelectedIndex(0);
        return true;
      }
      if (event.key === 'Escape') {
        if (viewMode === 'convert' && !props.isSelection) {
          event.preventDefault();
          setViewMode('main');
          return true;
        }
        if (props.onClose) {
          props.onClose();
          return true;
        }
      }
      return false;
    },
  }));

  const selectedSnippet = props.selectedText
    ? props.selectedText.length > 28
      ? `${props.selectedText.substring(0, 28)}...`
      : props.selectedText
    : '';

  return (
    <div className="glass-dropdown w-80 max-h-[380px] overflow-hidden rounded-2xl p-1.5 shadow-2xl border border-border/80 flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none">
      {/* Menu Header */}
      <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center justify-between gap-2 shrink-0">
        {viewMode === 'convert' ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            {!props.isSelection && (
              <button
                type="button"
                onClick={() => setViewMode('main')}
                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mr-0.5"
                title="Back to all blocks"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>Convert to Block</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Blocks & Commands</span>
          </div>
        )}

        {props.isSelection && selectedSnippet ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 max-w-[130px] truncate font-mono">
            "{selectedSnippet}"
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground font-mono">
            {currentItems.length} options
          </span>
        )}
      </div>

      {/* Optional Search Filter in Selection Mode */}
      {props.isSelection && (
        <div className="p-1.5 border-b border-border/40 shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={internalQuery}
              onChange={(e) => setInternalQuery(e.target.value)}
              placeholder="Search format (e.g. h2, check, bullet)..."
              autoFocus
              className="w-full pl-6 pr-2.5 py-1 rounded-lg bg-secondary/60 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {/* Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {currentItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No matching blocks found for "{internalQuery || props.query}"
          </div>
        ) : (
          currentItems.map((item: SlashItem, index: number) => {
            const isSelected = index === selectedIndex;
            const isConvertDrill = item.isConvertMenu;

            return (
              <button
                key={item.id || item.title}
                type="button"
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? isConvertDrill
                      ? 'bg-sky-500/15 text-foreground border border-sky-400/30 shadow-xs'
                      : 'bg-primary/15 text-foreground border border-primary/30 shadow-xs'
                    : 'text-foreground/80 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? isConvertDrill
                        ? 'bg-sky-500/20 border-sky-400/30'
                        : 'bg-primary/20 border-primary/30'
                      : 'bg-secondary/70 border-border/70'
                  }`}
                >
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold leading-tight">{item.title}</span>
                    {isConvertDrill && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold uppercase">
                        Submenu
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                    {item.description}
                  </div>
                </div>

                {isConvertDrill ? (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-70" />
                ) : isSelected ? (
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">↵</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="px-2.5 py-1 bg-secondary/20 border-t border-border/40 text-[10px] text-muted-foreground/70 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.2 rounded bg-secondary text-[9px] font-mono border border-border">↑↓</kbd> navigate
          <kbd className="px-1 py-0.2 rounded bg-secondary text-[9px] font-mono border border-border ml-1.5">↵</kbd> select
        </span>
        <span>
          {props.isSelection ? 'Converts selected text' : 'Type to filter'}
        </span>
      </div>
    </div>
  );
});

SlashMenuList.displayName = 'SlashMenuList';
