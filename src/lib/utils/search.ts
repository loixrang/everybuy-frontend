/**
 * Normalizes text for search comparisons: lowercase and strip diacritics.
 * NFD splits an accented character into its base letter plus combining marks,
 * so removing the marks makes "Café" match "cafe".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Shared typed-search predicate used across the app.
 *
 * Splits the query on whitespace and requires every word to appear somewhere
 * in the text. Words may be in any order, and comparison is case-insensitive
 * and accent-insensitive. An empty query matches everything.
 *
 * Example: "softcare small" matches "Softcare Premium Small Size 2".
 */
export function matchesSearch(text: string, query: string): boolean {
  const words = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = normalizeSearchText(text);
  return words.every((word) => haystack.includes(word));
}
