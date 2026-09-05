import React from 'react';
import { ThemeColorPalette } from '@/types/theme';
import { Sparkles, FileText, Check, ArrowRight } from 'lucide-react';

interface ThemePreviewMockupProps {
  colors: ThemeColorPalette;
  themeName?: string;
  isCompact?: boolean;
}

export const ThemePreviewMockup: React.FC<ThemePreviewMockupProps> = ({
  colors,
  themeName,
  isCompact = false,
}) => {
  if (isCompact) {
    return (
      <div
        className="w-full h-28 rounded-xl p-2.5 flex flex-col justify-between border transition-all overflow-hidden relative select-none shadow-sm"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.foreground,
        }}
      >
        {/* Mini Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
            <span
              className="text-[10px] font-semibold truncate max-w-[90px]"
              style={{ color: colors.foreground }}
            >
              {themeName || 'Theme'}
            </span>
          </div>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{
              backgroundColor: colors.secondary,
              color: colors.mutedForeground,
            }}
          >
            preview
          </span>
        </div>

        {/* Mini Content Card */}
        <div
          className="p-2 rounded-lg border flex flex-col gap-1.5 my-auto"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 w-16 rounded-full"
              style={{ backgroundColor: colors.heading1 || colors.heading || colors.foreground, opacity: 0.95 }}
            />
          </div>
          <div
            className="h-1 w-24 rounded-full"
            style={{ backgroundColor: colors.heading2 || colors.mutedForeground, opacity: 0.7 }}
          />
        </div>

        {/* Mini Palette Swatch Dots */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full border"
            style={{ backgroundColor: colors.background, borderColor: colors.border }}
            title="Background"
          />
          <span
            className="w-3 h-3 rounded-full border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            title="Card"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
            title="Primary Accent"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.heading1 || colors.heading || colors.foreground }}
            title="Heading 1"
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.foreground }}
            title="Foreground"
          />
        </div>
      </div>
    );
  }

  // Full detailed interactive preview mockup
  return (
    <div
      className="w-full rounded-2xl border p-4.5 transition-all shadow-xl select-none"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.foreground,
      }}
    >
      {/* Mock Window Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b mb-3.5" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-mono ml-2 font-medium" style={{ color: colors.mutedForeground }}>
            Synapse Live Mockup — {themeName || 'Custom'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              backgroundColor: colors.secondary,
              color: colors.primary,
            }}
          >
            <Sparkles className="w-3 h-3" />
            Theme Active
          </span>
        </div>
      </div>

      {/* Mock Workspace Split */}
      <div className="grid grid-cols-12 gap-3">
        {/* Mini Sidebar */}
        <div
          className="col-span-4 rounded-xl p-2.5 border flex flex-col justify-between"
          style={{
            backgroundColor: colors.sidebar || colors.card,
            borderColor: colors.border,
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-2 border-b" style={{ borderColor: colors.border }}>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                }}
              >
                S
              </div>
              <span className="text-xs font-bold truncate" style={{ color: colors.foreground }}>
                Engineering Notes
              </span>
            </div>

            {/* Nav items */}
            <div className="space-y-1 text-[11px]">
              <div
                className="px-2 py-1 rounded-lg font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.accentForeground || colors.foreground,
                }}
              >
                <FileText className="w-3 h-3" style={{ color: colors.primary }} />
                <span>Architecture 2026</span>
              </div>
              <div
                className="px-2 py-1 rounded-lg font-medium flex items-center gap-1.5 opacity-70"
                style={{ color: colors.mutedForeground }}
              >
                <FileText className="w-3 h-3" />
                <span>Brainstorming</span>
              </div>
            </div>
          </div>

          <div
            className="p-1.5 rounded-lg text-[10px] flex items-center justify-between"
            style={{ backgroundColor: colors.secondary, color: colors.mutedForeground }}
          >
            <span>Engine Status</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
          </div>
        </div>

        {/* Mini Note Editor Area */}
        <div className="col-span-8 space-y-3">
          {/* Note Card */}
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary/20 text-primary font-bold leading-none">H1</span>
                  <h4 className="text-sm font-bold tracking-tight" style={{ color: colors.heading1 || colors.heading || colors.foreground }}>
                    Distributed Knowledge Graph
                  </h4>
                </div>
                <p className="text-[11px]" style={{ color: colors.mutedForeground }}>
                  Last modified 2 minutes ago • 14 backlinks
                </p>
              </div>

              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
                }}
              >
                #system-design
              </span>
            </div>

            {/* H2 section preview */}
            <div className="pt-0.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary/10 text-muted-foreground font-semibold leading-none">H2</span>
                <h5 className="text-xs font-bold" style={{ color: colors.heading2 || colors.heading || colors.foreground }}>
                  Core Architecture & Graph Indexes
                </h5>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: colors.foreground, opacity: 0.85 }}>
                Synapse combines offline-first Dexie stores with zero-latency visual graphs.
              </p>
            </div>

            {/* H3 subsection preview */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary/10 text-muted-foreground font-semibold leading-none">H3</span>
                <h6 className="text-[11px] font-semibold" style={{ color: colors.heading3 || colors.heading || colors.foreground }}>
                  Reactive State & Cache Synchronization
                </h6>
              </div>
              {/* Blockquote with primary accent border */}
              <div
                className="text-[11px] p-2 rounded-r-lg border-l-2"
                style={{
                  borderLeftColor: colors.primary,
                  backgroundColor: colors.secondary,
                  color: colors.mutedForeground,
                }}
              >
                "Colors shape the focus and clarity of deep work."
              </div>
            </div>

            {/* Action Buttons Mockup */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Publish</span>
              </button>

              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  color: colors.secondaryForeground || colors.foreground,
                }}
              >
                <span>Explore</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
