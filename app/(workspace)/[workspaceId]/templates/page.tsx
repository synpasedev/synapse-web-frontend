'use client';

import React, { use, useState } from 'react';
import { useTemplates } from '@/hooks/use-templates';
import { useUIStore } from '@/stores/use-ui-store';
import { LayoutTemplate, Plus, Sparkles, Wand2, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function TemplatesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const { data: templates = [] } = useTemplates(workspaceId);
  const { setTemplateModalOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.content.blocks.some((b) => b.content?.text?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pt-16 sm:pt-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Workspace Templates & Blueprints
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production-ready document schemas with dynamic team variable interpolation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New from Blueprint</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blueprints by name, description, or keyword..."
          className="w-full bg-secondary/40 border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-indigo-500/80 transition-colors"
        />
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredTemplates.map((tmpl) => {
          const isCustom = tmpl.id.startsWith('tmpl-custom-');

          return (
            <div
              key={tmpl.id}
              className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/50 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-indigo-500/30 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl shrink-0 leading-none">{tmpl.icon || '📄'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                          {tmpl.title}
                        </h3>
                        {isCustom && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>
                    </div>
                  </div>
                </div>

                <div className="my-3.5 space-y-1.5 bg-secondary/30 p-3 rounded-xl border border-border/40">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Preset Structure</span>
                    <span className="font-mono text-[9px] text-muted-foreground/70">{tmpl.content.blocks.length} blocks</span>
                  </div>
                  {tmpl.content.blocks.slice(0, 4).map((b, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="text-[9px] font-mono text-indigo-400 bg-secondary px-1.5 py-0.5 rounded font-semibold shrink-0">
                        {b.type.replace('_', ' ')}
                      </span>
                      <span className="truncate text-foreground/85">{b.content?.text || 'Empty block'}</span>
                    </div>
                  ))}
                  {tmpl.content.blocks.length > 4 && (
                    <div className="text-[10px] text-muted-foreground/70 italic pl-1">
                      + {tmpl.content.blocks.length - 4} more blocks...
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTemplateModalOpen(true, { preselectedTemplateId: tmpl.id })}
                className="w-full mt-2 py-2.5 rounded-xl bg-secondary hover:bg-indigo-600 hover:text-white text-xs font-semibold text-foreground transition-all cursor-pointer border border-border/60 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Use this Blueprint</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
            No templates match "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
}
