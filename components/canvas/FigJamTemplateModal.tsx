'use client';

import React from 'react';
import { CanvasElement, CanvasConnection } from '@/types/domain';
import { X, Sparkles, Lightbulb, HeartHandshake, Scale, GitMerge, ListChecks } from 'lucide-react';

interface TemplateOption {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  generate: () => { elements: CanvasElement[]; connections: CanvasConnection[] };
}

export const FigJamTemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (elements: CanvasElement[], connections: CanvasConnection[]) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  if (!isOpen) return null;

  const now = new Date().toISOString();

  const templates: TemplateOption[] = [
    {
      id: 'brainstorming',
      title: '💡 Ideation & Brainstorming',
      category: 'Workshop',
      description: '3 organized columns for creative ideas, discussion, and next steps.',
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      generate: () => {
        const els: CanvasElement[] = [
          {
            id: `frame-${crypto.randomUUID().slice(0, 6)}`,
            type: 'frame',
            x: 100,
            y: 80,
            width: 780,
            height: 480,
            content: { title: '💡 Team Ideation Session' },
            z_index: 0,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 130,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '💡 Big Ideas:\n• AI assisted research\n• Keyboard first canvas navigation', color: '#fef08a', bg_color: '#713f12', author: 'Team' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 370,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '❓ Need Discussion:\n• Offline sync conflict resolution\n• Mobile touch gestures', color: '#fbcfe8', bg_color: '#500724', author: 'Design' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 610,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '🎯 Action Items:\n• Deploy FigJam whiteboard to master\n• Gather beta user feedback', color: '#bae6fd', bg_color: '#082f49', author: 'Product' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `stamp-${crypto.randomUUID().slice(0, 6)}`,
            type: 'stamp',
            x: 300,
            y: 330,
            width: 48,
            height: 48,
            content: { emoji: '🔥', count: 4 },
            z_index: 10,
            created_at: now,
            updated_at: now,
          },
          {
            id: `stamp-${crypto.randomUUID().slice(0, 6)}`,
            type: 'stamp',
            x: 540,
            y: 330,
            width: 48,
            height: 48,
            content: { emoji: '👍', count: 6 },
            z_index: 10,
            created_at: now,
            updated_at: now,
          },
        ];
        return { elements: els, connections: [] };
      },
    },
    {
      id: 'retro',
      title: '❤️ Mad / Sad / Glad Retro',
      category: 'Agile',
      description: 'Reflect on what went well, what caused friction, and what needs care.',
      icon: <HeartHandshake className="w-5 h-5 text-rose-400" />,
      generate: () => {
        const els: CanvasElement[] = [
          {
            id: `frame-${crypto.randomUUID().slice(0, 6)}`,
            type: 'frame',
            x: 100,
            y: 80,
            width: 780,
            height: 480,
            content: { title: '❤️ Team Sprint Retrospective' },
            z_index: 0,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 130,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '😡 Mad (Blockers):\n• Flaky CI/CD builds\n• Unclear ticket specs', color: '#fecdd3', bg_color: '#4c0519', author: 'Dev' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 370,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '😔 Sad (Wished Better):\n• Missed cross-timezone standup\n• Need better docs', color: '#fef08a', bg_color: '#713f12', author: 'QA' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 610,
            y: 150,
            width: 210,
            height: 170,
            content: { text: '😃 Glad (Celebrations):\n• Zero sync regressions!\n• Amazing team velocity', color: '#a7f3d0', bg_color: '#064e3b', author: 'Lead' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
        ];
        return { elements: els, connections: [] };
      },
    },
    {
      id: 'pros_cons',
      title: '⚖️ Pros & Cons Decision',
      category: 'Strategy',
      description: 'Weigh advantages and disadvantages to make clear product decisions.',
      icon: <Scale className="w-5 h-5 text-indigo-400" />,
      generate: () => {
        const els: CanvasElement[] = [
          {
            id: `frame-${crypto.randomUUID().slice(0, 6)}`,
            type: 'frame',
            x: 100,
            y: 80,
            width: 620,
            height: 460,
            content: { title: '⚖️ Architecture Decision Analysis' },
            z_index: 0,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 140,
            y: 160,
            width: 230,
            height: 200,
            content: { text: '✅ Advantages (Pros):\n• Instant 0ms offline read/write\n• Complete user data privacy\n• Works without internet', color: '#a7f3d0', bg_color: '#064e3b' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 410,
            y: 160,
            width: 230,
            height: 200,
            content: { text: '⚠️ Trade-offs (Cons):\n• Client-side storage quota\n• Requires IndexedDB indexing\n• Complex multi-device sync', color: '#fecdd3', bg_color: '#4c0519' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
        ];
        return { elements: els, connections: [] };
      },
    },
    {
      id: 'flowchart',
      title: '🔄 Flowchart & Process',
      category: 'Diagrams',
      description: 'Step-by-step logic flow with shapes and connector arrows.',
      icon: <GitMerge className="w-5 h-5 text-emerald-400" />,
      generate: () => {
        const id1 = `shape-start-${crypto.randomUUID().slice(0, 4)}`;
        const id2 = `shape-step-${crypto.randomUUID().slice(0, 4)}`;
        const id3 = `shape-decide-${crypto.randomUUID().slice(0, 4)}`;
        const id4 = `shape-end-${crypto.randomUUID().slice(0, 4)}`;

        const els: CanvasElement[] = [
          {
            id: id1,
            type: 'shape',
            x: 120,
            y: 200,
            width: 140,
            height: 60,
            content: { shape_type: 'pill', text: 'Start Process', color: '#10b981', stroke_color: '#34d399' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: id2,
            type: 'shape',
            x: 320,
            y: 195,
            width: 160,
            height: 70,
            content: { shape_type: 'rectangle', text: 'Validate Input', color: '#6366f1', stroke_color: '#818cf8' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: id3,
            type: 'shape',
            x: 540,
            y: 180,
            width: 100,
            height: 100,
            content: { shape_type: 'diamond', text: 'Valid?', color: '#f59e0b', stroke_color: '#fbbf24' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: id4,
            type: 'shape',
            x: 720,
            y: 200,
            width: 140,
            height: 60,
            content: { shape_type: 'pill', text: 'Success (End)', color: '#3b82f6', stroke_color: '#60a5fa' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
        ];

        const conns: CanvasConnection[] = [
          { id: `c-1`, from_element_id: id1, to_element_id: id2, from_anchor: 'right', to_anchor: 'left', style: 'straight', color: '#10b981' },
          { id: `c-2`, from_element_id: id2, to_element_id: id3, from_anchor: 'right', to_anchor: 'left', style: 'straight', color: '#818cf8' },
          { id: `c-3`, from_element_id: id3, to_element_id: id4, from_anchor: 'right', to_anchor: 'left', style: 'straight', color: '#fbbf24' },
        ];

        return { elements: els, connections: conns };
      },
    },
    {
      id: 'standup',
      title: '📋 Daily Sprint Standup',
      category: 'Agile',
      description: 'Quick sync layout for team members with progress and impediments.',
      icon: <ListChecks className="w-5 h-5 text-purple-400" />,
      generate: () => {
        const els: CanvasElement[] = [
          {
            id: `frame-${crypto.randomUUID().slice(0, 6)}`,
            type: 'frame',
            x: 100,
            y: 80,
            width: 780,
            height: 480,
            content: { title: '📋 Daily Standup Board' },
            z_index: 0,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 130,
            y: 150,
            width: 210,
            height: 180,
            content: { text: '⏮️ Yesterday:\n• Shipped whiteboard UI\n• Fixed click selection bug', color: '#bae6fd', bg_color: '#082f49', author: 'Frontend' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 370,
            y: 150,
            width: 210,
            height: 180,
            content: { text: '▶️ Today:\n• Polish freehand pen engine\n• Verify timer & templates', color: '#fef08a', bg_color: '#713f12', author: 'Core' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
          {
            id: `sticky-${crypto.randomUUID().slice(0, 6)}`,
            type: 'sticky',
            x: 610,
            y: 150,
            width: 210,
            height: 180,
            content: { text: '🛑 Blockers:\n• None at the moment!', color: '#a7f3d0', bg_color: '#064e3b', author: 'All' },
            z_index: 2,
            created_at: now,
            updated_at: now,
          },
        ];
        return { elements: els, connections: [] };
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#181922] border border-border/80 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">FigJam Whiteboard Templates</h2>
              <p className="text-xs text-muted-foreground">
                One-click starter layouts for workshops, retros, and brainstorming.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                const { elements, connections } = tpl.generate();
                onInsert(elements, connections);
                onClose();
              }}
              className="flex flex-col text-left p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="p-2 rounded-xl bg-background/60 border border-border/40 group-hover:scale-105 transition-transform">
                  {tpl.icon}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-0.5 rounded-full bg-background/50 border border-border/30">
                  {tpl.category}
                </span>
              </div>
              <span className="text-xs font-bold text-foreground mb-1 group-hover:text-indigo-300 transition-colors">
                {tpl.title}
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tpl.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
