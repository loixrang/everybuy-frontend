import { useCallback, useSyncExternalStore } from 'react';
import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from './theme-preference';

export type { Theme, ThemePreference } from './theme-preference';

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'device';
  }
}

function readSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

let currentPreference = readPreference();
let currentTheme = resolveTheme(currentPreference, readSystemTheme());
const listeners = new Set<() => void>();
const mediaQuery = typeof window === 'undefined'
  ? null
  : window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
}

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot() {
  return `${currentPreference}:${currentTheme}`;
}

function updateTheme(preference: ThemePreference, persist: boolean) {
  currentPreference = preference;
  const nextTheme = resolveTheme(preference, readSystemTheme());
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // The in-memory setting remains usable when storage is blocked.
    }
  }
  if (nextTheme !== currentTheme) {
    currentTheme = nextTheme;
    applyTheme(nextTheme);
    notify();
  } else {
    applyTheme(nextTheme);
    notify();
  }
}

function handleSystemThemeChange() {
  if (currentPreference === 'device') updateTheme('device', false);
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY || event.key === null) {
    updateTheme(parseThemePreference(event.newValue), false);
  }
}

if (mediaQuery) {
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  window.addEventListener('storage', handleStorageChange);
}

// Reconcile the HTML initializer with the store before React renders.
applyTheme(currentTheme);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface ThemeControls {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

export function useTheme(): ThemeControls {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => 'device:light',
  );
  const [preference, theme] = snapshot.split(':') as [ThemePreference, Theme];
  const setPreference = useCallback((next: ThemePreference) => {
    updateTheme(next, true);
  }, []);
  const toggleTheme = useCallback(() => {
    setPreference(currentTheme === 'light' ? 'dark' : 'light');
  }, [setPreference]);

  return { theme, preference, setPreference, toggleTheme };
}
