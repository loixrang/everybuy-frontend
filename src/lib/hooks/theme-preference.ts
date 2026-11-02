export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'device';

export const THEME_STORAGE_KEY = 'everybuy-theme';

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'device'
    ? value
    : 'device';
}

export function resolveTheme(preference: ThemePreference, systemTheme: Theme): Theme {
  return preference === 'device' ? systemTheme : preference;
}
