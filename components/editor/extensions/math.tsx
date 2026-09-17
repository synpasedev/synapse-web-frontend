import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { Sigma, Check, Edit2 } from 'lucide-react';

const MathComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const formula = node.attrs.formula || 'E = mc^2';
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(formula);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputVal(node.attrs.formula || '');
  }, [node.attrs.formula]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  let renderedHtml = '';
  try {
    renderedHtml = katex.renderToString(formula, {
      throwOnError: false,
      displayMode: true,
    });
  } catch (err: any) {
    renderedHtml = `<span class="text-rose-400 text-xs">${err?.message || 'Invalid LaTeX syntax'}</span>`;
  }

  const handleSave = () => {
    updateAttributes({ formula: inputVal });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="math-node-wrapper my-4">
      <div className="group relative rounded-xl border border-border/50 bg-card/60 hover:border-indigo-500/40 p-4 transition-all shadow-xs">
        {/* Header Tag */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            <Sigma className="w-3.5 h-3.5" />
            <span>LaTeX Math Equation</span>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer text-xs flex items-center gap-1 opacity-60 group-hover:opacity-100"
            title="Edit LaTeX equation"
          >
            {isEditing ? <Check className="w-3 h-3 text-emerald-400" /> : <Edit2 className="w-3 h-3" />}
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        {/* Live LaTeX Editor Input */}
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              placeholder="e.g. \\frac{a}{b} or E = mc^2"
              className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-background/80 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        ) : (
          /* Rendered KaTeX Equation */
          <div
            onClick={() => setIsEditing(true)}
            className="overflow-x-auto py-2 cursor-pointer text-center text-foreground hover:bg-white/[0.02] rounded-lg transition-colors"
            title="Click to edit LaTeX"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const MathExtension = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      formula: {
        default: 'E = mc^2',
        parseHTML: (element) => element.getAttribute('data-formula') || 'E = mc^2',
        renderHTML: (attributes) => ({ 'data-formula': attributes.formula }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-formula]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'math-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },
});
