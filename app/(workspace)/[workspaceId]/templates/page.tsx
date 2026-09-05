'use client';

import React, { use } from 'react';
import { useTemplates } from '@/hooks/use-templates';
import { useUIStore } from '@/stores/use-ui-store';
import { LayoutTemplate, Plus, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export default function TemplatesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const { data: templates } = useTemplates(workspaceId);
  const { setTemplateModalOpen } = useUIStore();

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Workspace Templates
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reusable document schemas with dynamic variable placeholders
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates?.map((tmpl) => (
          <div
            key={tmpl.id}
            className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{tmpl.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{tmpl.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                </div>
              </div>

              <div className="my-4 space-y-1.5 bg-black/20 p-3 rounded-xl border border-border/40">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                  Preset Block Structure
                </div>
                {tmpl.content.blocks.slice(0, 4).map((b, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-[10px] font-mono text-indigo-400 bg-secondary px-1.5 py-0.5 rounded">
                      {b.type}
                    </span>
                    <span className="truncate">{b.content.text || 'Empty'}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="w-full mt-2 py-2 rounded-xl bg-secondary/80 hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer border border-border/60"
            >
              Use this Blueprint
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
