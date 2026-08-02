import { useCallback, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

export function useTheme() {
  const { settings, setSetting } = useSettings();

  const saved = settings.theme;
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setSetting('theme', theme === 'dark' ? 'light' : 'dark');
  }, [theme, setSetting]);

  return { theme, toggleTheme };
}