export interface ThemeColorPalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar?: string;
  sidebarBorder?: string;
  heading?: string;
  heading1?: string;
  heading2?: string;
  heading3?: string;
}

export type ThemeType = 'dark' | 'light';

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  type: ThemeType;
  colors: ThemeColorPalette;
  previewColors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
    text: string;
  };
  tags?: string[];
  isCustom?: boolean;
  createdAt?: number;
}
