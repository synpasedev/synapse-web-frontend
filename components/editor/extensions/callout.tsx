import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React, { useState } from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  Quote,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type CalloutType = 'info' | 'tip' | 'warning' | 'danger' | 'quote';

const CALLOUT_THEMES: Record<
  CalloutType,
  {
    bg: string;
    border: string;
    text: string;
    accent: string;
    defaultIcon: string;
    label: string;
  }
> = {
  info: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/10',
    border: 'border-sky-500/40',
    text: 'text-sky-300',
    accent: 'bg-sky-500',
    defaultIcon: 'ℹ️',
    label: 'Info',
  },
  tip: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    accent: 'bg-emerald-500',
    defaultIcon: '💡',
    label: 'Tip',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    accent: 'bg-amber-500',
    defaultIcon: '⚠️',
    label: 'Warning',
  },
  danger: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/10',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    accent: 'bg-rose-500',
    defaultIcon: '🚨',
    label: 'Danger',
  },
  quote: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
    accent: 'bg-purple-500',
    defaultIcon: '💬',
    label: 'Note',
  },
};

const CalloutComponent: React.FC<any> = ({ node, updateAttributes, editor }) => {
  const type: CalloutType = node.attrs.type || 'info';
  const icon: string = node.attrs.icon || CALLOUT_THEMES[type]?.defaultIcon || 'ℹ️';
  const [isCollapsed, setIsCollapsed] = useState<boolean>(node.attrs.isCollapsed || false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const theme = CALLOUT_THEMES[type] || CALLOUT_THEMES.info;

  const handleTypeChange = (newType: CalloutType) => {
    updateAttributes({
      type: newType,
      icon: CALLOUT_THEMES[newType].defaultIcon,
    });
    setShowTypeMenu(false);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isCollapsed;
    setIsCollapsed(next);
    updateAttributes({ isCollapsed: next });
  };

  return (
    <NodeViewWrapper className="callout-node-wrapper my-3.5">
      <div
        className={`relative rounded-xl border ${theme.border} ${theme.bg} transition-all duration-200 shadow-xs overflow-hidden`}
      >
        {/* Callout Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 select-none">
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => setShowTypeMenu((prev) => !prev)}
              className="text-base hover:scale-110 transition-transform cursor-pointer p-0.5 rounded hover:bg-white/10 flex items-center gap-1"
              title="Change callout style"
            >
              <span>{icon}</span>
              <span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
                {theme.label}
              </span>
            </button>

            {/* Type selector dropdown */}
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-border/70 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 min-w-[130px] backdrop-blur-md">
                {(Object.keys(CALLOUT_THEMES) as CalloutType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-secondary text-foreground text-left transition-colors cursor-pointer"
                  >
                    <span>{CALLOUT_THEMES[t].defaultIcon}</span>
                    <span className="capitalize">{CALLOUT_THEMES[t].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title={isCollapsed ? 'Expand callout' : 'Collapse callout'}
          >
            {isCollapsed ? (
              <>
                <span>Expand</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Callout Body Content */}
        {!isCollapsed && (
          <div className="p-3.5 pt-2 text-foreground/90 leading-relaxed font-sans text-sm">
            <NodeViewContent />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-type') || 'info',
        renderHTML: (attributes) => ({ 'data-type': attributes.type }),
      },
      icon: {
        default: 'ℹ️',
        parseHTML: (element) => element.getAttribute('data-icon') || 'ℹ️',
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon }),
      },
      isCollapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({ 'data-collapsed': attributes.isCollapsed }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'callout-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
