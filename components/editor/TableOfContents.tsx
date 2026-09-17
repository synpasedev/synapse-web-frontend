'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ListCollapse, ChevronRight, Hash, X } from 'lucide-react';

interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface TableOfContentsProps {
  editor: any;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const extractHeadings = () => {
      const items: HeadingItem[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading') {
          const text = node.textContent.trim();
          if (text) {
            items.push({
              id: `heading-${pos}`,
              level: node.attrs.level,
              text,
              pos,
            });
          }
        }
      });
      setHeadings(items);
    };

    extractHeadings();
    editor.on('update', extractHeadings);

    return () => {
      editor.off('update', extractHeadings);
    };
  }, [editor]);

  const handleScrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    setActiveHeadingId(`heading-${pos}`);
  };

  if (!headings.length) return null;

  return (
    <>
      {/* Floating Toggle Button on the Right */}
      <div className="fixed top-20 right-4 z-30 hidden md:block">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-medium ${
            isOpen
              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
              : 'bg-card/80 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          title="Document Outline / Table of Contents"
        >
          <ListCollapse className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-semibold">{headings.length}</span>
        </button>
      </div>

      {/* Floating Outline Drawer */}
      {isOpen && (
        <div className="fixed top-28 right-4 z-30 hidden md:block w-72 max-h-[70vh] bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-3.5 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ListCollapse className="w-3.5 h-3.5 text-indigo-400" />
              <span>Table of Contents</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {headings.map((item) => {
              const isActive = activeHeadingId === item.id;
              const indentClass =
                item.level === 1
                  ? 'pl-1 font-semibold text-foreground'
                  : item.level === 2
                  ? 'pl-3 text-muted-foreground hover:text-foreground'
                  : 'pl-6 text-muted-foreground/80 hover:text-foreground text-[11px]';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleScrollToHeading(item.pos)}
                  className={`w-full text-left py-1 px-2 rounded-lg text-xs truncate transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-secondary/60 ${indentClass} ${
                    isActive ? 'bg-indigo-500/15 text-indigo-300 font-semibold' : ''
                  }`}
                  title={item.text}
                >
                  <Hash className="w-3 h-3 opacity-40 shrink-0" />
                  <span className="truncate">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
