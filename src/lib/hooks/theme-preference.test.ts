import { describe, expect, test } from 'bun:test';
import { parseThemePreference, resolveTheme } from './theme-preference';

describe('theme preferences', () => {
  test('defaults missing and invalid values to Device', () => {
    expect(parseThemePreference(null)).toBe('device');
    expect(parseThemePreference('system')).toBe('device');
  });

  test('Device resolves to the operating system theme', () => {
    expect(resolveTheme('device', 'light')).toBe('light');
    expect(resolveTheme('device', 'dark')).toBe('dark');
  });

  test('explicit Light and Dark override the operating system theme', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
