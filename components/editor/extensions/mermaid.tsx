import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { GitGraph, Code2, Eye, RefreshCw } from 'lucide-react';

const DEFAULT_MERMAID = `graph TD
  A[Idea] --> B(Concept)
  B --> C{Feasible?}
  C -->|Yes| D[Execution]
  C -->|No| A`;

let mermaidInitialized = false;

const MermaidComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const code = node.attrs.code || DEFAULT_MERMAID;
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(code);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    setInputVal(node.attrs.code || DEFAULT_MERMAID);
  }, [node.attrs.code]);

  useEffect(() => {
    if (!mermaidInitialized && typeof window !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#191a22',
          primaryColor: '#6366f1',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#4f46e5',
          lineColor: '#818cf8',
          secondaryColor: '#3b82f6',
          tertiaryColor: '#1e293b',
        },
      });
      mermaidInitialized = true;
    }

    let isMounted = true;

    async function renderDiagram() {
      try {
        setRenderError(null);
        const uniqueId = idRef.current;
        const { svg } = await mermaid.render(uniqueId, code);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderError(err?.message || 'Syntax error in Mermaid diagram');
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleApply = () => {
    updateAttributes({ code: inputVal });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper my-4">
      <div className="group relative rounded-xl border border-border/60 bg-card/60 hover:border-indigo-500/40 p-4 transition-all shadow-xs">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
            <GitGraph className="w-3.5 h-3.5" />
            <span>Mermaid Diagram</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer flex items-center gap-1"
              title={isEditing ? 'Preview diagram' : 'Edit diagram code'}
            >
              {isEditing ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
              <span>{isEditing ? 'Preview' : 'Edit Code'}</span>
            </button>
          </div>
        </div>

        {/* Edit Mode */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter Mermaid syntax (graph TD, sequenceDiagram, etc.)"
              className="w-full font-mono text-xs px-3 py-2 rounded-lg bg-background/90 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/60 leading-relaxed"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Update Diagram
              </button>
            </div>
          </div>
        ) : (
          /* Rendered Diagram View */
          <div className="overflow-x-auto py-2 flex justify-center">
            {renderError ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {renderError}
              </div>
            ) : svgContent ? (
              <div
                className="mermaid-svg-container max-w-full [&>svg]:mx-auto [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Rendering diagram...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const MermaidExtension = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: {
        default: DEFAULT_MERMAID,
        parseHTML: (element) => element.getAttribute('data-code') || DEFAULT_MERMAID,
        renderHTML: (attributes) => ({ 'data-code': attributes.code }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mermaid]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': 'true', class: 'mermaid-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },
});
