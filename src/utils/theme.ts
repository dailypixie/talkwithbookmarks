import * as React from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (e.g. private mode)
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Initialize theme from storage and apply to document.
 * Call once before React mount (e.g. inline script) to avoid flash.
 */
export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Set theme, persist to storage, and apply to document.
 */
export function setTheme(next: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  applyTheme(next);
}

/**
 * Read current theme (from DOM state).
 */
export function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Hook for theme state. Call initTheme() before first render to avoid flash.
 */
export function useTheme(): [Theme, (theme: Theme) => void, () => void] {
  const [theme, setThemeState] = React.useState<Theme>(getTheme);

  React.useEffect(() => setThemeState(getTheme()), []);

  const setThemeFn = React.useCallback((value: Theme) => {
    setTheme(value);
    setThemeState(value);
  }, []);

  const toggle = React.useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeFn(next);
  }, [theme, setThemeFn]);

  return [theme, setThemeFn, toggle];
}
