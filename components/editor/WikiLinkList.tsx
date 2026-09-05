'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Note } from '@/types/domain';

export interface WikiSuggestionItem {
  id: string;
  title: string;
  icon: string | null;
  isNew?: boolean;
}

export const WikiLinkList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items?.length) {
    return (
      <div className="glass-dropdown p-3 rounded-xl text-xs text-muted-foreground w-64">
        Type to link a note...
      </div>
    );
  }

  return (
    <div className="glass-dropdown w-72 max-h-72 overflow-y-auto rounded-xl p-1.5 shadow-2xl border border-border/80">
      <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Link Existing Note
      </div>
      {props.items.map((item: WikiSuggestionItem, index: number) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            index === selectedIndex
              ? 'bg-indigo-600/20 text-foreground border border-indigo-500/30'
              : 'text-foreground/80 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="text-base">{item.icon || '📄'}</span>
          <span className="text-sm font-medium truncate flex-1">{item.title}</span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            note
          </span>
        </button>
      ))}
    </div>
  );
});

WikiLinkList.displayName = 'WikiLinkList';
