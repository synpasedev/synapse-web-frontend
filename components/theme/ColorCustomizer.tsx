'use client';

import React, { useState } from 'react';
import { useThemeStore } from '@/stores/use-theme-store';
import { ThemeColorPalette } from '@/types/theme';
import { PRESET_THEMES } from '@/lib/themes/presets';
import { generateCssSnippet } from '@/lib/themes/theme-dom';
import { ThemePreviewMockup } from './ThemePreviewMockup';
import {
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Download,
  Upload,
  BookmarkPlus,
  Palette,
  Sliders,
  Paintbrush,
  Heading1,
  Type,
  Layout,
  Flame,
} from 'lucide-react';

interface ColorFieldConfig {
  key: keyof ThemeColorPalette;
  label: string;
  badge?: string;
  category: 'headings' | 'typography' | 'surfaces' | 'accents';
  description: string;
  quickSwatches: string[];
}

const COLOR_FIELDS: ColorFieldConfig[] = [
  // Headings
  {
    key: 'heading1',
    label: 'Heading 1 (H1) & Note Titles',
    badge: 'H1',
    category: 'headings',
    description: 'Main note titles, page titles, and H1 document headings.',
    quickSwatches: ['#ffffff', '#f0f2fa', '#38bdf8', '#f3e8ff', '#eceff4', '#34d399', '#f8f8f2', '#fbbf24', '#0f172a', '#1c1917'],
  },
  {
    key: 'heading2',
    label: 'Heading 2 (H2) & Section Headers',
    badge: 'H2',
    category: 'headings',
    description: 'Section headings, H2 document blocks, and major card headers.',
    quickSwatches: ['#c5c9ed', '#22d3ee', '#c084fc', '#88c0d0', '#6ee7b7', '#ff79c6', '#f59e0b', '#f472b6', '#312e81', '#92400e'],
  },
  {
    key: 'heading3',
    label: 'Heading 3 (H3) & Subheadings',
    badge: 'H3',
    category: 'headings',
    description: 'Subheadings, H3 blocks, and tertiary section titles.',
    quickSwatches: ['#9ea5d6', '#67e8f9', '#a855f7', '#81a1c1', '#a7f3d0', '#bd93f9', '#fcd34d', '#f9a8d4', '#4338ca', '#b45309'],
  },

  // Typography
  {
    key: 'foreground',
    label: 'Body Text & Paragraphs',
    category: 'typography',
    description: 'Primary body copy, paragraph text, bullet points, and general readable content.',
    quickSwatches: ['#e1e3ec', '#f1f5f9', '#e0def4', '#eceff4', '#ecfdf5', '#f8f8f2', '#0f172a', '#292524'],
  },
  {
    key: 'mutedForeground',
    label: 'Muted Typography & Meta',
    category: 'typography',
    description: 'Metadata, timestamps, subtle breadcrumbs, and placeholder labels.',
    quickSwatches: ['#84899c', '#64748b', '#6e6a86', '#7b8394', '#6ee7b7', '#8985a8', '#a39281', '#78716c'],
  },

  // Surfaces & Base
  {
    key: 'background',
    label: 'Main Canvas Background',
    category: 'surfaces',
    description: 'The foundation canvas color behind notes, graph, and workspace.',
    quickSwatches: ['#13141a', '#0a0e17', '#12121e', '#181726', '#171412', '#f8fafc', '#f7f4ed', '#000000'],
  },
  {
    key: 'card',
    label: 'Card & Surface Panels',
    category: 'surfaces',
    description: 'Elevated containers, note cards, sidebars, and active panels.',
    quickSwatches: ['#191a22', '#111827', '#1a1a2b', '#212035', '#211d1a', '#ffffff', '#1e293b', '#18181b'],
  },
  {
    key: 'border',
    label: 'Border & Dividers',
    category: 'surfaces',
    description: 'Subtle borders defining panels, note boundaries, and modals.',
    quickSwatches: ['#262836', '#1e293b', '#2a2842', '#333a47', '#1f3b31', '#3b322a', '#e2e8f0', '#e2d8c7'],
  },

  // Brand & Accents
  {
    key: 'primary',
    label: 'Primary Brand Accent',
    category: 'accents',
    description: 'Action buttons, active highlights, cursor glows, and focus rings.',
    quickSwatches: ['#7b81dc', '#06b6d4', '#a855f7', '#88c0d0', '#10b981', '#bd93f9', '#f59e0b', '#f472b6', '#4f46e5'],
  },
  {
    key: 'secondary',
    label: 'Secondary & Buttons',
    category: 'accents',
    description: 'Secondary button pills, tags, input boxes, and subtle surfaces.',
    quickSwatches: ['#21232d', '#1f293d', '#242338', '#2e3440', '#1b322a', '#2e2620', '#f1f5f9', '#ece5d8'],
  },
];

export const ColorCustomizer: React.FC = () => {
  const {
    currentColors,
    updateColor,
    resetToPreset,
    saveCustomTheme,
    exportThemeJson,
    importThemeJson,
    activeThemeId,
  } = useThemeStore();

  const [customName, setCustomName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'headings' | 'typography' | 'surfaces' | 'accents'>('all');

  const categoryCounts = {
    all: COLOR_FIELDS.length,
    headings: COLOR_FIELDS.filter((f) => f.category === 'headings').length,
    typography: COLOR_FIELDS.filter((f) => f.category === 'typography').length,
    surfaces: COLOR_FIELDS.filter((f) => f.category === 'surfaces').length,
    accents: COLOR_FIELDS.filter((f) => f.category === 'accents').length,
  };

  const filteredFields =
    selectedCategory === 'all'
      ? COLOR_FIELDS
      : COLOR_FIELDS.filter((f) => f.category === selectedCategory);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    saveCustomTheme(customName.trim());
    setCustomName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopyCss = () => {
    const css = generateCssSnippet(currentColors);
    navigator.clipboard.writeText(css);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const handleExport = () => {
    const jsonStr = exportThemeJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportError('');
    const success = importThemeJson(importText);
    if (success) {
      setIsImportOpen(false);
      setImportText('');
    } else {
      setImportError('Invalid theme JSON schema. Please ensure it has valid colors.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Preview Bar */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Real-Time Visual Preview
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Changes apply live across your entire workspace
          </span>
        </div>
        <ThemePreviewMockup colors={currentColors} themeName="Live Custom Studio" />
      </div>

      {/* Preset Starters */}
      <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Paintbrush className="w-3.5 h-3.5 text-primary" />
            <span>Start from a Base Preset</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Quickly preload colors to tweak
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => resetToPreset(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeThemeId === preset.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border-border/70'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full border border-black/20"
                style={{ backgroundColor: preset.previewColors.primary }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>All Tokens ({categoryCounts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('headings')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'headings'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
          }`}
        >
          <Heading1 className="w-3.5 h-3.5" />
          <span>Headings ({categoryCounts.headings})</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            selectedCategory === 'headings' ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
          }`}>
            H1 • H2 • H3
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('typography')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'typography'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Body Text ({categoryCounts.typography})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('surfaces')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'surfaces'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Surfaces ({categoryCounts.surfaces})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('accents')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'accents'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Accents ({categoryCounts.accents})</span>
        </button>
      </div>

      {/* Interactive Color Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredFields.map((field) => {
          const currentColor = currentColors[field.key] || '#000000';
          const isHeadingField = field.category === 'headings';

          return (
            <div
              key={field.key}
              className={`p-3.5 rounded-2xl bg-card/60 border hover:border-border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                isHeadingField ? 'border-primary/30 bg-card/80 ring-1 ring-primary/10' : 'border-border/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {field.badge ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-mono text-[10px] font-bold">
                        {field.badge}
                      </span>
                    ) : (
                      <Sliders className="w-3 h-3 text-primary" />
                    )}
                    <span>{field.label}</span>
                  </label>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {field.key}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {field.description}
                </p>
              </div>

              {/* Controls: Color swatch + Hex Input + Swatches */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {/* Native Color Picker Trigger */}
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={currentColor.startsWith('#') ? currentColor : '#13141a'}
                      onChange={(e) => updateColor(field.key, e.target.value)}
                      className="w-9 h-9 rounded-xl border border-border cursor-pointer opacity-0 absolute inset-0 z-10"
                      title="Choose custom color"
                    />
                    <div
                      className="w-9 h-9 rounded-xl border border-border shadow-xs flex items-center justify-center transition-transform hover:scale-105"
                      style={{ backgroundColor: currentColor }}
                    >
                      <Palette className="w-3.5 h-3.5 opacity-60 mix-blend-difference text-white" />
                    </div>
                  </div>

                  {/* Hex Text Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={currentColor}
                      onChange={(e) => updateColor(field.key, e.target.value)}
                      placeholder="#13141a"
                      className="w-full px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                  <span className="text-[10px] text-muted-foreground/70 mr-1">Tones:</span>
                  {field.quickSwatches.map((swatch, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updateColor(field.key, swatch)}
                      className="w-4 h-4 rounded-full border border-border/80 hover:scale-125 transition-transform cursor-pointer shrink-0 shadow-xs"
                      style={{ backgroundColor: swatch }}
                      title={swatch}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Custom Preset Form & Action Toolbar */}
      <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-3.5">
        <form onSubmit={handleSave} className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Name your custom theme (e.g., Midnight Neon, Cozy Coffee)..."
            className="flex-1 w-full px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={!customName.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved to Presets!</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save as Custom Theme</span>
              </>
            )}
          </button>
        </form>

        {/* Utilities: Copy CSS, Export, Import, Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCss}
              className="px-3 py-1.5 rounded-xl bg-card hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCss ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSS Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy CSS Variables</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 rounded-xl bg-card hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export theme JSON configuration"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportOpen(!isImportOpen)}
              className="px-3 py-1.5 rounded-xl bg-card hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Theme</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => resetToPreset()}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-secondary border border-border/70 text-muted-foreground hover:text-destructive transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Colors</span>
          </button>
        </div>

        {/* Import Drawer */}
        {isImportOpen && (
          <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2 mt-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Paste Theme JSON:</span>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"name": "My Theme", "colors": { "background": "#13141a", ... }}'
              className="w-full p-2.5 rounded-lg bg-secondary/50 border border-border/70 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
            />
            {importError && (
              <p className="text-[11px] text-destructive">{importError}</p>
            )}
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={!importText.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              Apply & Save Imported Theme
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
