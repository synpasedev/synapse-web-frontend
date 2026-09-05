import { ThemeColorPalette, ThemeType } from '@/types/theme';

export function applyThemeToDOM(colors: ThemeColorPalette, type: ThemeType) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Apply CSS custom properties
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-foreground', colors.cardForeground || colors.foreground);
  root.style.setProperty('--popover', colors.popover || colors.card);
  root.style.setProperty('--popover-foreground', colors.popoverForeground || colors.foreground);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.primaryForeground);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--muted-foreground', colors.mutedForeground);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.accentForeground);
  root.style.setProperty('--destructive', colors.destructive || '#ef4444');
  root.style.setProperty('--destructive-foreground', colors.destructiveForeground || '#ffffff');
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input', colors.input);
  root.style.setProperty('--ring', colors.ring || colors.primary);

  // Heading color tokens with hierarchical fallbacks
  const h1 = colors.heading1 || colors.heading || colors.foreground;
  const h2 = colors.heading2 || colors.heading || colors.foreground;
  const h3 = colors.heading3 || colors.heading2 || colors.heading || colors.foreground;
  const heading = colors.heading || colors.heading1 || colors.foreground;

  root.style.setProperty('--heading', heading);
  root.style.setProperty('--heading-1', h1);
  root.style.setProperty('--heading-2', h2);
  root.style.setProperty('--heading-3', h3);

  // Custom workspace sidebar tokens if present
  if (colors.sidebar) {
    root.style.setProperty('--sidebar', colors.sidebar);
  } else {
    root.style.setProperty('--sidebar', colors.card);
  }

  if (colors.sidebarBorder) {
    root.style.setProperty('--sidebar-border', colors.sidebarBorder);
  } else {
    root.style.setProperty('--sidebar-border', colors.border);
  }

  // Manage dark / light class on <html>
  if (type === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }
}

/**
 * Determine whether a hex color is dark or light
 */
export function isDarkColor(hex: string): boolean {
  if (!hex) return true;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return true;

  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  // HSP (Highly Sensitive Poo) equation from Darias
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp < 127.5;
}

/**
 * Generate readable CSS code for a theme palette
 */
export function generateCssSnippet(colors: ThemeColorPalette): string {
  return `:root {
  --background: ${colors.background};
  --foreground: ${colors.foreground};
  --heading: ${colors.heading || colors.heading1 || colors.foreground};
  --heading-1: ${colors.heading1 || colors.heading || colors.foreground};
  --heading-2: ${colors.heading2 || colors.heading || colors.foreground};
  --heading-3: ${colors.heading3 || colors.heading || colors.foreground};
  --card: ${colors.card};
  --card-foreground: ${colors.cardForeground};
  --popover: ${colors.popover};
  --popover-foreground: ${colors.popoverForeground};
  --primary: ${colors.primary};
  --primary-foreground: ${colors.primaryForeground};
  --secondary: ${colors.secondary};
  --secondary-foreground: ${colors.secondaryForeground};
  --muted: ${colors.muted};
  --muted-foreground: ${colors.mutedForeground};
  --accent: ${colors.accent};
  --accent-foreground: ${colors.accentForeground};
  --destructive: ${colors.destructive};
  --destructive-foreground: ${colors.destructiveForeground};
  --border: ${colors.border};
  --input: ${colors.input};
  --ring: ${colors.ring};
}`;
}
