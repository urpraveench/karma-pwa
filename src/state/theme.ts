import { useCallback, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'tiktym:theme';

export function readTheme(): Theme {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}

export function applyTheme(t: Theme) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);
  const setTheme = useCallback((t: Theme) => {
    try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
    applyTheme(t); setThemeState(t);
  }, []);
  return [theme, setTheme] as const;
}
