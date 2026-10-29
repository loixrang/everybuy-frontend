import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'everybuy-theme';

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return null;
  }
}

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/*
 * A tiny module-level store keeps every mounted `useTheme()` consumer in sync.
 * The authenticated shell and the settings page can both be on screen, so a
 * local `useState` would leave the header icon stale after a settings change.
 */
let currentTheme: Theme = getInitialTheme();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persisting is best-effort; the applied theme still works for this tab.
  }
}

function setThemeValue(theme: Theme) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(theme);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Apply before first paint so a stored dark preference never flashes light.
applyTheme(currentTheme);

export interface ThemeControls {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Applies the stored/system theme to `<html data-theme>` and keeps it in
 * localStorage. Shared by the authenticated shell, the sign-in screen, and the
 * settings page so every surface honours the same light/dark preference.
 */
export function useTheme(): ThemeControls {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => 'light' as Theme,
  );

  const setTheme = useCallback((next: Theme) => {
    setThemeValue(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeValue(currentTheme === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, setTheme, toggleTheme };
}
