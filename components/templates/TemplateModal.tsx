'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTemplates } from '@/hooks/use-templates';
import { useCreateNote } from '@/hooks/use-notes';
import { useMutateBlocks } from '@/hooks/use-blocks';
import { parseTemplateString } from '@/lib/template-parser';
import { useUIStore } from '@/stores/use-ui-store';
import { X, Sparkles, Plus, FileText, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Block } from '@/types/domain';

export const TemplateModal: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const router = useRouter();
  const { isTemplateModalOpen, setTemplateModalOpen } = useUIStore();
  const { data: templates } = useTemplates(workspaceId);
  const { mutateAsync: createNote } = useCreateNote();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isTemplateModalOpen) return null;

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId) || templates?.[0];

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    setIsCreating(true);

    try {
      const parsedTitle = parseTemplateString(
        noteTitle.trim() || selectedTemplate.content.title,
        { title: noteTitle.trim() || 'New Document' }
      );

      // 1. Create new Note
      const newNote = await createNote({
        workspaceId,
        title: parsedTitle,
        icon: selectedTemplate.icon || '📄',
      });

      // 2. Instantiate and interpolate blocks
      const now = new Date().toISOString();
      const instantiatedBlocks: Block[] = selectedTemplate.content.blocks.map((b, idx) => ({
        id: crypto.randomUUID(),
        note_id: newNote.id,
        workspace_id: workspaceId,
        parent_block_id: null,
        type: b.type,
        content: {
          text: b.content?.text ? parseTemplateString(b.content.text, { title: parsedTitle }) : '',
          nodes: b.content?.nodes,
        },
        properties: b.properties || {},
        sort_order: (idx + 1) * 1000,
        created_by: 'local-user',
        updated_by: 'local-user',
        created_at: now,
        updated_at: now,
        version: 1,
      }));

      // 3. Save instantiated blocks
      const { localDb } = await import('@/lib/dexie/db');
      await localDb.blocks.bulkPut(instantiatedBlocks);

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      setTemplateModalOpen(false);
      router.push(`/${workspaceId}/notes/${newNote.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-dropdown w-full max-w-2xl rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-foreground">Template Library</h2>
          </div>
          <button
            type="button"
            onClick={() => setTemplateModalOpen(false)}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-y-auto">
          {/* Template List */}
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
              Select a Blueprint
            </div>
            {templates?.map((tmpl) => {
              const isSelected = tmpl.id === (selectedTemplateId || templates[0]?.id);
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-foreground'
                      : 'hover:bg-secondary/60 border border-transparent text-muted-foreground'
                  }`}
                >
                  <span className="text-2xl shrink-0">{tmpl.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-foreground">{tmpl.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {tmpl.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview & Customization */}
          <div className="p-5 flex flex-col justify-between space-y-4 bg-black/20">
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Note Title Placeholder
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder={selectedTemplate.title}
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Included Structure ({selectedTemplate.content.blocks.length} blocks)
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedTemplate.content.blocks.map((b, i) => (
                      <div
                        key={i}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-card/60 border border-border/40 text-muted-foreground flex items-center gap-2"
                      >
                        <span className="text-[10px] font-mono uppercase bg-secondary px-1 py-0.5 rounded text-indigo-400">
                          {b.type}
                        </span>
                        <span className="truncate">
                          {b.content.text || 'Empty block'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/40 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Create from Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
