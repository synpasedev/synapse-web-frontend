'use client';

import React, { useEffect, useLayoutEffect } from 'react';
import { useThemeStore } from '@/stores/use-theme-store';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initTheme = useThemeStore((state) => state.initTheme);

  useIsomorphicLayoutEffect(() => {
    initTheme();
  }, [initTheme]);

  return <>{children}</>;
};
