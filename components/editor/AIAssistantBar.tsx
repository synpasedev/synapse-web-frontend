'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Check,
  Copy,
  ArrowDownToLine,
  X,
  Send,
  ListTodo,
  Wand2,
  FileText,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIAssistantBarProps {
  getNoteContent: () => string;
  onInsertContent: (content: string) => void;
}

type AIAction = 'summarize' | 'improve' | 'action_items' | 'expand' | 'chat';

export const AIAssistantBar: React.FC<AIAssistantBarProps> = ({
  getNoteContent,
  onInsertContent,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAIRequest = async (
    endpoint: string,
    body: Record<string, any>,
    action: AIAction
  ) => {
    setLoading(true);
    setActiveAction(action);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      if (data.result) {
        setResult(data.result);
        setProviderName(data.provider || 'Google Gemini');
        if (action === 'summarize' || action === 'action_items') {
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not complete AI request.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleSummarize = () => {
    const text = getNoteContent();
    if (!text.trim()) {
      setError('Please add some content to your note first.');
      return;
    }
    executeAIRequest('/api/ai/summarize', { text }, 'summarize');
  };

  const handleImprove = () => {
    const text = getNoteContent();
    if (!text.trim()) {
      setError('Please add some content to your note first.');
      return;
    }
    executeAIRequest('/api/ai/improve', { text }, 'improve');
  };

  const handleActionItems = () => {
    const text = getNoteContent();
    if (!text.trim()) {
      setError('Please add some content to your note first.');
      return;
    }
    executeAIRequest('/api/ai/action-items', { text }, 'action_items');
  };

  const handleExpand = () => {
    const text = getNoteContent();
    if (!text.trim()) {
      setError('Please add some content to your note first.');
      return;
    }
    executeAIRequest('/api/ai/expand', { bullet: text.slice(0, 400) }, 'expand');
  };

  const handleCustomPromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customPrompt.trim()) return;

    const context = getNoteContent();
    executeAIRequest(
      '/api/ai/chat',
      { prompt: customPrompt.trim(), context },
      'chat'
    );
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
    <div className="my-3.5 space-y-2.5">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
            activeAction === 'summarize'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
              : 'bg-indigo-500/10 hover:bg-indigo-500/18 text-indigo-300 border border-indigo-400/20'
          }`}
          title="Extract key takeaways & overview"
        >
          {loading && activeAction === 'summarize' ? (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-300" />
          ) : (
            <Sparkles className="w-3 h-3 text-indigo-300" />
          )}
          <span>Summarize</span>
        </button>

        <button
          type="button"
          onClick={handleImprove}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
            activeAction === 'improve'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
              : 'bg-purple-500/10 hover:bg-purple-500/18 text-purple-300 border border-purple-400/20'
          }`}
          title="Polish grammar, phrasing, and flow"
        >
          {loading && activeAction === 'improve' ? (
            <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
          ) : (
            <Wand2 className="w-3 h-3 text-purple-300" />
          )}
          <span>Improve Writing</span>
        </button>

        <button
          type="button"
          onClick={handleActionItems}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
            activeAction === 'action_items'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'bg-emerald-500/10 hover:bg-emerald-500/18 text-emerald-300 border border-emerald-400/20'
          }`}
          title="Extract checklist-ready tasks"
        >
          {loading && activeAction === 'action_items' ? (
            <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
          ) : (
            <ListTodo className="w-3 h-3 text-emerald-300" />
          )}
          <span>Action Items</span>
        </button>

        <button
          type="button"
          onClick={handleExpand}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
            activeAction === 'expand'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'bg-cyan-500/10 hover:bg-cyan-500/18 text-cyan-300 border border-cyan-400/20'
          }`}
          title="Elaborate on thoughts or brief outlines"
        >
          {loading && activeAction === 'expand' ? (
            <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />
          ) : (
            <FileText className="w-3 h-3 text-cyan-300" />
          )}
          <span>Expand</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPromptInput(!showPromptInput)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            showPromptInput
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/40'
          }`}
        >
          <MessageSquare className="w-3 h-3 text-amber-300" />
          <span>Ask Gemini</span>
        </button>
      </div>

      {/* Freeform Prompt Input */}
      {showPromptInput && (
        <form
          onSubmit={handleCustomPromptSubmit}
          className="p-2.5 rounded-xl border border-indigo-500/30 bg-card/90 backdrop-blur-md shadow-md animate-in fade-in slide-in-from-top-1 duration-150 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ask Gemini anything about this note... (e.g., 'Translate to French', 'List 3 risks')"
              className="flex-1 px-3 py-1.5 bg-secondary/50 border border-border/60 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !customPrompt.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              {loading && activeAction === 'chat' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Ask</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
            <span className="text-muted-foreground/60">Ideas:</span>
            <button
              type="button"
              onClick={() => setCustomPrompt('Translate to Spanish')}
              className="px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Translate to Spanish
            </button>
            <button
              type="button"
              onClick={() => setCustomPrompt('Convert into an executive briefing')}
              className="px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Executive briefing
            </button>
            <button
              type="button"
              onClick={() => setCustomPrompt('What are the main potential risks or gaps?')}
              className="px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Find potential risks
            </button>
          </div>
        </form>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-0.5 hover:bg-destructive/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-2.5 p-4 rounded-xl border border-indigo-500/20 bg-card/95 backdrop-blur-md relative transition-all shadow-md animate-in zoom-in-98 duration-150 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                {providerName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="px-2.5 py-1 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                title="Insert at bottom of note"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span className="text-[11px]">Insert into Note</span>
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer ml-1"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto pr-1">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
