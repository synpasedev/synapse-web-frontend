'use client';

import React, { useState } from 'react';
import { useThemeStore } from '@/stores/use-theme-store';
import { PRESET_THEMES } from '@/lib/themes/presets';
import { ThemeDefinition, ThemeType } from '@/types/theme';
import { ThemePreviewMockup } from './ThemePreviewMockup';
import { Check, Search, Trash2, Moon, Sun, Sparkles } from 'lucide-react';

export const ThemePresetGrid: React.FC = () => {
  const { activeThemeId, setThemeById, savedCustomThemes, deleteCustomTheme } = useThemeStore();
  const [filterType, setFilterType] = useState<'all' | ThemeType | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allThemes: ThemeDefinition[] = [...PRESET_THEMES, ...savedCustomThemes];

  const filteredThemes = allThemes.filter((theme) => {
    // Type filter
    if (filterType === 'dark' && theme.type !== 'dark') return false;
    if (filterType === 'light' && theme.type !== 'light') return false;
    if (filterType === 'custom' && !theme.isCustom) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = theme.name.toLowerCase().includes(q);
      const matchDesc = theme.description.toLowerCase().includes(q);
      const matchTags = theme.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTags;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/70 self-start">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({allThemes.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('dark')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              filterType === 'dark'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="w-3 h-3 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('light')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              filterType === 'light'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>Light</span>
          </button>

          {savedCustomThemes.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'custom'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Custom ({savedCustomThemes.length})</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter themes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-secondary/50 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
        {filteredThemes.map((theme) => {
          const isActive = activeThemeId === theme.id;

          return (
            <div
              key={theme.id}
              onClick={() => setThemeById(theme.id)}
              className={`group relative rounded-2xl border p-3.5 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-200 select-none ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20 bg-card shadow-lg'
                  : 'border-border/80 bg-card/60 hover:bg-card hover:border-border hover:shadow-md'
              }`}
            >
              {/* Miniature Workspace Mockup Preview */}
              <ThemePreviewMockup
                colors={theme.colors}
                themeName={theme.name}
                isCompact={true}
              />

              {/* Theme Header & Details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {theme.name}
                  </h3>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/30">
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {theme.type}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {theme.description}
                </p>
              </div>

              {/* Tags and Controls Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                <div className="flex items-center gap-1 flex-wrap">
                  {theme.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {theme.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomTheme(theme.id);
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                    title="Delete custom theme"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredThemes.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground text-xs space-y-2">
            <p>No themes found matching "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Reset search filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
