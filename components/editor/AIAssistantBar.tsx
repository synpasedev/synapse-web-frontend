'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, Check, Copy, ArrowDownToLine, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIAssistantBarProps {
  getNoteContent: () => string;
  onInsertContent: (content: string) => void;
}

export const AIAssistantBar: React.FC<AIAssistantBarProps> = ({
  getNoteContent,
  onInsertContent,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    const text = getNoteContent();
    if (!text.trim()) return;

    setLoading(true);
    setActiveAction('summarize');
    setResult(null);

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setProviderName(data.provider || 'AI Assistant');
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async () => {
    const text = getNoteContent();
    if (!text.trim()) return;

    setLoading(true);
    setActiveAction('expand');
    setResult(null);

    try {
      const res = await fetch('/api/ai/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullet: text.slice(0, 300) }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setProviderName(data.provider || 'AI Assistant');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!result) return;
    onInsertContent(result);
    setResult(null);
  };

  return (
    <div className="my-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/8 hover:bg-indigo-500/15 text-indigo-300 border border-indigo-400/15 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          {loading && activeAction === 'summarize' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 text-indigo-300" />
          )}
          <span>Summarize</span>
        </button>

        <button
          type="button"
          onClick={handleExpand}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          {loading && activeAction === 'expand' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 text-purple-300" />
          )}
          <span>Expand</span>
        </button>
      </div>

      {result && (
        <div className="mt-2.5 p-3.5 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md relative transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-300">
                {providerName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                title="Insert at bottom of note"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span className="text-[11px]">Insert</span>
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
