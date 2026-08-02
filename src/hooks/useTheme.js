import { useCallback, useEffect, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { THEME_KEY } from '../utils/constants';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = loadState(THEME_KEY, null);
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveState(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
