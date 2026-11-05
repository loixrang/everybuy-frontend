import { describe, expect, test } from 'bun:test';
import { matchesSearch, normalizeSearchText } from './search';

const NAME = 'Softcare Premium Small Size 2';

describe('matchesSearch', () => {
  test('matches words in any order', () => {
    expect(matchesSearch(NAME, 'softcare small')).toBe(true);
    expect(matchesSearch(NAME, 'small softcare')).toBe(true);
  });

  test('matches partial words anywhere in the name', () => {
    expect(matchesSearch(NAME, 'size 2')).toBe(true);
    expect(matchesSearch(NAME, 'prem 2')).toBe(true);
  });

  test('ignores case and extra whitespace', () => {
    expect(matchesSearch(NAME, 'SOFTCARE   small')).toBe(true);
    expect(matchesSearch(NAME, '  softcare   small  ')).toBe(true);
  });

  test('requires every word to appear', () => {
    expect(matchesSearch(NAME, 'softcare large')).toBe(false);
    expect(matchesSearch(NAME, 'softcare small 3')).toBe(false);
  });

  test('an empty query matches everything', () => {
    expect(matchesSearch(NAME, '')).toBe(true);
    expect(matchesSearch(NAME, '   ')).toBe(true);
  });

  test('ignores accents and diacritics', () => {
    expect(matchesSearch('Café Crème', 'cafe creme')).toBe(true);
    expect(matchesSearch('Crème', 'creme')).toBe(true);
    expect(matchesSearch('Jollof Rice', 'jollof')).toBe(true);
  });

  test('searches the combined text when callers join multiple fields', () => {
    const haystack = ['Softcare Premium', 'Small Size 2', 'Softcare'].join(' ');
    expect(matchesSearch(haystack, 'premium softcare')).toBe(true);
  });
});

describe('normalizeSearchText', () => {
  test('lowercases and strips combining marks', () => {
    expect(normalizeSearchText('Ámàkà')).toBe('amaka');
  });
});
