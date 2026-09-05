import { create } from 'zustand';
import { ThemeColorPalette, ThemeDefinition, ThemeType } from '@/types/theme';
import { PRESET_THEMES, DEFAULT_THEME_ID } from '@/lib/themes/presets';
import { applyThemeToDOM, isDarkColor } from '@/lib/themes/theme-dom';

interface ThemeState {
  activeThemeId: string;
  currentColors: ThemeColorPalette;
  currentType: ThemeType;
  savedCustomThemes: ThemeDefinition[];
  isInitialized: boolean;

  initTheme: () => void;
  setThemeById: (id: string) => void;
  updateColor: (key: keyof ThemeColorPalette, value: string) => void;
  saveCustomTheme: (name: string, description?: string) => string;
  deleteCustomTheme: (id: string) => void;
  resetToPreset: (presetId?: string) => void;
  exportThemeJson: () => string;
  importThemeJson: (jsonString: string) => boolean;
}

const STORAGE_ACTIVE_KEY = 'synapse_active_theme_id';
const STORAGE_COLORS_KEY = 'synapse_active_theme_colors';
const STORAGE_CUSTOMS_KEY = 'synapse_saved_custom_themes';

const defaultPreset = PRESET_THEMES.find((t) => t.id === DEFAULT_THEME_ID) || PRESET_THEMES[0];

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeThemeId: DEFAULT_THEME_ID,
  currentColors: { ...defaultPreset.colors },
  currentType: defaultPreset.type,
  savedCustomThemes: [],
  isInitialized: false,

  initTheme: () => {
    if (typeof window === 'undefined') return;

    let savedCustomThemes: ThemeDefinition[] = [];
    try {
      const customsRaw = localStorage.getItem(STORAGE_CUSTOMS_KEY);
      if (customsRaw) {
        savedCustomThemes = JSON.parse(customsRaw);
      }
    } catch {
      savedCustomThemes = [];
    }

    let activeId = localStorage.getItem(STORAGE_ACTIVE_KEY) || DEFAULT_THEME_ID;
    let colors: ThemeColorPalette | null = null;

    try {
      const colorsRaw = localStorage.getItem(STORAGE_COLORS_KEY);
      if (colorsRaw) {
        colors = JSON.parse(colorsRaw);
      }
    } catch {
      colors = null;
    }

    // Resolve matching preset or saved custom theme
    const allThemes = [...PRESET_THEMES, ...savedCustomThemes];
    const matched = allThemes.find((t) => t.id === activeId);

    let finalColors: ThemeColorPalette;
    let finalType: ThemeType;

    if (activeId === 'custom' && colors) {
      finalColors = {
        ...defaultPreset.colors,
        heading: colors.heading || colors.heading1 || defaultPreset.colors.heading,
        heading1: colors.heading1 || colors.heading || defaultPreset.colors.heading1,
        heading2: colors.heading2 || colors.heading || defaultPreset.colors.heading2,
        heading3: colors.heading3 || colors.heading || defaultPreset.colors.heading3,
        ...colors,
      };
      finalType = isDarkColor(finalColors.background) ? 'dark' : 'light';
    } else if (matched) {
      finalColors = colors ? { ...matched.colors, ...colors } : matched.colors;
      finalType = matched.type;
    } else {
      activeId = DEFAULT_THEME_ID;
      finalColors = defaultPreset.colors;
      finalType = defaultPreset.type;
    }

    applyThemeToDOM(finalColors, finalType);

    set({
      activeThemeId: activeId,
      currentColors: finalColors,
      currentType: finalType,
      savedCustomThemes,
      isInitialized: true,
    });
  },

  setThemeById: (id: string) => {
    const { savedCustomThemes } = get();
    const allThemes = [...PRESET_THEMES, ...savedCustomThemes];
    const target = allThemes.find((t) => t.id === id);

    if (!target) return;

    const newColors = { ...target.colors };
    const newType = target.type;

    applyThemeToDOM(newColors, newType);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ACTIVE_KEY, target.id);
      localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(newColors));
    }

    set({
      activeThemeId: target.id,
      currentColors: newColors,
      currentType: newType,
    });
  },

  updateColor: (key: keyof ThemeColorPalette, value: string) => {
    const { currentColors } = get();
    const updatedColors = { ...currentColors, [key]: value };

    // If updating background, check if type flips from dark to light
    let updatedType = get().currentType;
    if (key === 'background') {
      updatedType = isDarkColor(value) ? 'dark' : 'light';
    }

    // Auto calculate primary-foreground contrast if primary changes
    if (key === 'primary') {
      updatedColors.primaryForeground = isDarkColor(value) ? '#ffffff' : '#0f172a';
      updatedColors.ring = value;
    }

    // Keep heading alias synchronized if heading1 is updated
    if (key === 'heading1' && !updatedColors.heading) {
      updatedColors.heading = value;
    }

    applyThemeToDOM(updatedColors, updatedType);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ACTIVE_KEY, 'custom');
      localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(updatedColors));
    }

    set({
      activeThemeId: 'custom',
      currentColors: updatedColors,
      currentType: updatedType,
    });
  },

  saveCustomTheme: (name: string, description?: string) => {
    const { currentColors, currentType, savedCustomThemes } = get();
    const customId = `custom-${Date.now()}`;

    const newTheme: ThemeDefinition = {
      id: customId,
      name: name.trim() || 'My Custom Theme',
      description: description?.trim() || 'User configured custom theme palette.',
      type: currentType,
      isCustom: true,
      createdAt: Date.now(),
      previewColors: {
        bg: currentColors.background,
        card: currentColors.card,
        primary: currentColors.primary,
        accent: currentColors.accent,
        text: currentColors.foreground,
      },
      colors: { ...currentColors },
      tags: ['Custom'],
    };

    const updatedCustoms = [newTheme, ...savedCustomThemes];

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CUSTOMS_KEY, JSON.stringify(updatedCustoms));
      localStorage.setItem(STORAGE_ACTIVE_KEY, customId);
    }

    set({
      savedCustomThemes: updatedCustoms,
      activeThemeId: customId,
    });

    return customId;
  },

  deleteCustomTheme: (id: string) => {
    const { savedCustomThemes, activeThemeId } = get();
    const updatedCustoms = savedCustomThemes.filter((t) => t.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CUSTOMS_KEY, JSON.stringify(updatedCustoms));
    }

    set({ savedCustomThemes: updatedCustoms });

    if (activeThemeId === id) {
      get().setThemeById(DEFAULT_THEME_ID);
    }
  },

  resetToPreset: (presetId?: string) => {
    const targetId = presetId || DEFAULT_THEME_ID;
    get().setThemeById(targetId);
  },

  exportThemeJson: () => {
    const { activeThemeId, currentColors, currentType, savedCustomThemes } = get();
    const currentTheme =
      [...PRESET_THEMES, ...savedCustomThemes].find((t) => t.id === activeThemeId) || {
        name: 'Custom Synapse Theme',
        description: 'Exported Synapse custom theme palette',
      };

    return JSON.stringify(
      {
        version: 1,
        name: currentTheme.name,
        type: currentType,
        colors: currentColors,
      },
      null,
      2
    );
  },

  importThemeJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.colors || !parsed.colors.background || !parsed.colors.primary) {
        return false;
      }

      const importedPalette: ThemeColorPalette = {
        ...defaultPreset.colors,
        ...parsed.colors,
      };

      const importedType: ThemeType =
        parsed.type === 'light' || parsed.type === 'dark'
          ? parsed.type
          : isDarkColor(importedPalette.background)
          ? 'dark'
          : 'light';

      const customId = `custom-${Date.now()}`;
      const newTheme: ThemeDefinition = {
        id: customId,
        name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Custom Theme',
        description: 'Imported Synapse custom color palette.',
        type: importedType,
        isCustom: true,
        createdAt: Date.now(),
        previewColors: {
          bg: importedPalette.background,
          card: importedPalette.card,
          primary: importedPalette.primary,
          accent: importedPalette.accent,
          text: importedPalette.foreground,
        },
        colors: importedPalette,
        tags: ['Imported', 'Custom'],
      };

      const { savedCustomThemes } = get();
      const updatedCustoms = [newTheme, ...savedCustomThemes];

      applyThemeToDOM(importedPalette, importedType);

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_CUSTOMS_KEY, JSON.stringify(updatedCustoms));
        localStorage.setItem(STORAGE_ACTIVE_KEY, customId);
        localStorage.setItem(STORAGE_COLORS_KEY, JSON.stringify(importedPalette));
      }

      set({
        savedCustomThemes: updatedCustoms,
        activeThemeId: customId,
        currentColors: importedPalette,
        currentType: importedType,
      });

      return true;
    } catch {
      return false;
    }
  },
}));
