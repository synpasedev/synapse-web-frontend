'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '@/stores/use-theme-store';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <>{children}</>;
};
