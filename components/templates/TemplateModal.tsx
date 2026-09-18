'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTemplates, useCreateTemplate, useDeleteTemplate } from '@/hooks/use-templates';
import { useCreateNote, useUpdateNote } from '@/hooks/use-notes';
import { parseTemplateString } from '@/lib/template-parser';
import { useUIStore } from '@/stores/use-ui-store';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/hooks/use-workspace';
import { broadcastTabSync } from '@/lib/dexie/tab-sync';
import { synapseRealtime } from '@/lib/realtime/ws-client';
import { localDb } from '@/lib/dexie/db';
import Link from 'next/link';
import { X, Sparkles, Plus, FileText, Check, Trash2, Wand2, Loader2, ArrowRight, LayoutTemplate } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Block, BlockType, Template } from '@/types/domain';

export const TemplateModal: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: workspace } = useWorkspace(workspaceId);
  const { isTemplateModalOpen, setTemplateModalOpen, templateModalOptions } = useUIStore();
  const { data: templates = [] } = useTemplates(workspaceId);
  const { mutateAsync: createNote } = useCreateNote();
  const { mutateAsync: updateNote } = useUpdateNote();
  const { mutateAsync: createTemplate } = useCreateTemplate();
  const { mutateAsync: deleteTemplate } = useDeleteTemplate();

  const [activeTab, setActiveTab] = useState<'browse' | 'ai'>('browse');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Synchronize preselected template from options when opened
  useEffect(() => {
    if (isTemplateModalOpen) {
      if (templateModalOptions?.preselectedTemplateId) {
        setSelectedTemplateId(templateModalOptions.preselectedTemplateId);
      } else if (templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [isTemplateModalOpen, templateModalOptions, templates]);

  if (!isTemplateModalOpen) return null;

  const targetNoteId = templateModalOptions?.targetNoteId || null;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    setIsCreating(true);

    try {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const authorName = user?.name || user?.email?.split('@')[0] || 'Member';
      const wsName = workspace?.name || 'Workspace';

      const parsedTitle = parseTemplateString(
        noteTitle.trim() || selectedTemplate.content.title,
        {
          title: noteTitle.trim() || selectedTemplate.title,
          user: authorName,
          workspace: wsName,
          date: formattedDate,
          time: formattedTime,
        }
      );

      let effectiveNoteId = targetNoteId;

      if (!effectiveNoteId) {
        // 1. Create new Note if not targeting an existing note
        const newNote = await createNote({
          workspaceId,
          title: parsedTitle,
          icon: selectedTemplate.icon || '📄',
        });
        effectiveNoteId = newNote.id;
      } else {
        // Update existing note title and icon
        await updateNote({
          id: effectiveNoteId,
          updates: {
            title: parsedTitle,
            icon: selectedTemplate.icon || '📄',
          },
        });
      }

      // 2. Instantiate and interpolate blocks
      const timestampIso = now.toISOString();
      const instantiatedBlocks: Block[] = selectedTemplate.content.blocks.map((b, idx) => ({
        id: crypto.randomUUID(),
        note_id: effectiveNoteId!,
        workspace_id: workspaceId,
        parent_block_id: null,
        type: b.type,
        content: {
          text: b.content?.text
            ? parseTemplateString(b.content.text, {
                title: parsedTitle,
                user: authorName,
                workspace: wsName,
                date: formattedDate,
                time: formattedTime,
              })
            : '',
          nodes: b.content?.nodes,
        },
        properties: b.properties || {},
        sort_order: (idx + 1) * 1000,
        created_by: authorName,
        updated_by: authorName,
        created_at: timestampIso,
        updated_at: timestampIso,
        version: 1,
      }));

      // 3. Atomically overwrite blocks for this note with instantiated template blocks
      await localDb.transaction('rw', [localDb.blocks], async () => {
        await localDb.blocks.where('note_id').equals(effectiveNoteId!).delete();
        await localDb.blocks.bulkPut(instantiatedBlocks);
      });

      // 4. Dispatch to shared server store
      fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: effectiveNoteId,
          workspaceId,
          blocks: instantiatedBlocks,
        }),
      }).catch((err) => console.warn('Failed to broadcast template blocks:', err));

      // 5. Broadcast over WebSocket to all room collaborators
      synapseRealtime.sendBlocksChange(workspaceId, effectiveNoteId, instantiatedBlocks);

      // 6. Invalidate query cache & broadcast tab sync
      queryClient.invalidateQueries({ queryKey: ['blocks', effectiveNoteId] });
      queryClient.invalidateQueries({ queryKey: ['note', effectiveNoteId] });
      queryClient.invalidateQueries({ queryKey: ['notes', workspaceId] });
      broadcastTabSync({ type: 'NOTE_MUTATED', noteId: effectiveNoteId, workspaceId });

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}

      setTemplateModalOpen(false);
      router.push(`/${workspaceId}/notes/${effectiveNoteId}`);
    } catch (err) {
      console.error('[TemplateModal] Failed to apply template:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateAITemplate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (!res.ok) {
        throw new Error(`AI generation failed (status ${res.status})`);
      }

      const data = await res.json();
      const generatedTitle = data.title || aiPrompt.trim();
      const rawContent: string = data.content || '';

      // Parse markdown lines into structured blocks
      const lines = rawContent.split('\n').filter((l) => l.trim().length > 0);
      const blocks: Array<{ type: BlockType; content: { text: string }; properties?: any }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          blocks.push({ type: 'heading_1', content: { text: trimmed.replace(/^#\s+/, '') } });
        } else if (trimmed.startsWith('## ')) {
          blocks.push({ type: 'heading_2', content: { text: trimmed.replace(/^##\s+/, '') } });
        } else if (trimmed.startsWith('### ')) {
          blocks.push({ type: 'heading_3', content: { text: trimmed.replace(/^###\s+/, '') } });
        } else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
          blocks.push({ type: 'todo_list', content: { text: trimmed.replace(/^[-*]\s+\[\s*\]\s+/, '') } });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          blocks.push({ type: 'bullet_list', content: { text: trimmed.replace(/^[-*]\s+/, '') } });
        } else if (trimmed.startsWith('> ')) {
          blocks.push({ type: 'callout', content: { text: trimmed.replace(/^>\s+/, '') } });
        } else if (trimmed.startsWith('```')) {
          continue;
        } else {
          blocks.push({ type: 'paragraph', content: { text: trimmed } });
        }
      }

      if (blocks.length === 0) {
        blocks.push({ type: 'paragraph', content: { text: rawContent || aiPrompt } });
      }

      const newTemplate = await createTemplate({
        workspace_id: workspaceId,
        title: generatedTitle,
        description: `AI-generated blueprint based on: "${aiPrompt.trim()}"`,
        icon: '✨',
        content: {
          title: generatedTitle,
          blocks,
        },
        created_by: user?.name || user?.email || 'AI',
      });

      setSelectedTemplateId(newTemplate.id);
      setActiveTab('browse');
      setAiPrompt('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate template with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDeleteCustomTemplate = async (tmplId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTemplate({ id: tmplId, workspaceId });
    if (selectedTemplateId === tmplId) {
      const remaining = templates.filter((t) => t.id !== tmplId);
      setSelectedTemplateId(remaining[0]?.id || null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-dropdown w-full max-w-3xl rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-card/95 text-foreground">
        {/* Header with Navigation Tabs */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {targetNoteId ? 'Apply Template to Note' : 'Template Library'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Choose a pre-configured blueprint or generate one with AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  activeTab === 'browse'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Blueprints
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-background text-indigo-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Wand2 className="w-3 h-3" />
                <span>AI Generator</span>
              </button>
            </div>

            <Link
              href={`/${workspaceId}/templates`}
              onClick={() => setTemplateModalOpen(false)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Open full-page template gallery"
            >
              <LayoutTemplate className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setTemplateModalOpen(false)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: AI Generator */}
        {activeTab === 'ai' ? (
          <div className="p-6 space-y-4 max-w-xl mx-auto w-full">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                <Wand2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-foreground">Generate Custom Blueprint with AI</h3>
              <p className="text-xs text-muted-foreground">
                Describe the type of document, workflow, or checklist you need. Synapse AI will structure the blocks automatically.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Incident Postmortem with 5 Whys and Action Items timeline&#10;or Weekly 1-on-1 performance sync for engineering leads"
                rows={4}
                className="w-full bg-secondary/50 border border-border/80 rounded-xl p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-indigo-500 transition-colors resize-none"
              />

              {aiError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                  {aiError}
                </div>
              )}
            </div>

            {/* Quick Prompt Ideas */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Popular ideas:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Security Incident Response Runbook',
                  'Customer Onboarding Checklist',
                  'Quarterly Business Review (QBR)',
                  'Release Notes & Changelog',
                ].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setAiPrompt(idea)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Back to Blueprints
              </button>
              <button
                type="button"
                onClick={handleGenerateAITemplate}
                disabled={isGeneratingAI || !aiPrompt.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Blueprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Blueprints Library & Preview */
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-y-auto min-h-[380px]">
            {/* Left: Template Selector List */}
            <div className="p-3.5 space-y-1.5 overflow-y-auto max-h-[60vh]">
              <div className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1 flex items-center justify-between">
                <span>Available Blueprints</span>
                <span className="text-[10px] font-mono text-muted-foreground/60">{templates.length} total</span>
              </div>

              {templates.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No templates found. Switch to the AI Generator to create one!
                </div>
              ) : (
                templates.map((tmpl) => {
                  const isSelected = tmpl.id === (selectedTemplateId || templates[0]?.id);
                  const isCustom = tmpl.id.startsWith('tmpl-custom-');

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`group w-full flex items-start justify-between gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-foreground'
                          : 'hover:bg-secondary/50 border-transparent text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="text-xl shrink-0 leading-none">{tmpl.icon || '📄'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">{tmpl.title}</span>
                            {isCustom && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 font-normal">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {tmpl.description}
                          </div>
                        </div>
                      </div>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTemplate(tmpl.id, e)}
                          title="Delete custom blueprint"
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Blueprint Preview & Action Panel */}
            <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-secondary/15 overflow-y-auto max-h-[60vh]">
              {selectedTemplate ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Target Note Title
                    </label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder={selectedTemplate.title}
                      className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>Blueprint Schema</span>
                      <span className="text-[10px] font-mono text-muted-foreground/70">
                        {selectedTemplate.content.blocks.length} blocks
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedTemplate.content.blocks.map((b, i) => (
                        <div
                          key={i}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-card/70 border border-border/40 text-muted-foreground flex items-center gap-2"
                        >
                          <span className="text-[9px] font-mono uppercase bg-secondary px-1.5 py-0.5 rounded text-indigo-400 font-semibold shrink-0">
                            {b.type.replace('_', ' ')}
                          </span>
                          <span className="truncate text-foreground/90 font-medium">
                            {b.content?.text || 'Blank block'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground italic">
                  Select a blueprint on the left to preview its schema.
                </div>
              )}

              <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <div className="text-[10px] text-muted-foreground">
                  {targetNoteId ? 'Will overwrite note blocks' : 'Creates new collaborative note'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    disabled={isCreating || !selectedTemplate}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Instantiating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>{targetNoteId ? 'Apply to Note' : 'Create from Blueprint'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
