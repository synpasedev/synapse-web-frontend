'use client';

import React, { useState } from 'react';
import { ThemePresetGrid } from './ThemePresetGrid';
import { ColorCustomizer } from './ColorCustomizer';
import { Palette, Sliders, Sparkles } from 'lucide-react';

export const ThemeSettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  return (
    <div className="p-6 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-md shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Workspace Appearance & Themes
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
                <Sparkles className="w-2.5 h-2.5" />
                Live Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select handcrafted dark & light palettes or fine-tune individual tokens in the Color Studio
            </p>
          </div>
        </div>

        {/* Tab switcher pills */}
        <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border/70 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-primary" />
            <span>Pre-Built Themes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Configurable Colors</span>
          </button>
        </div>
      </div>

      {/* Embedded Tab Content */}
      <div>
        {activeTab === 'presets' ? (
          <ThemePresetGrid />
        ) : (
          <ColorCustomizer />
        )}
      </div>
    </div>
  );
};
