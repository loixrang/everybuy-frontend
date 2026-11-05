/**
 * Builds the short avatar label used for customer rows.
 * Uses the first letter of the first two words, uppercased.
 * Example: "Itoro Essien" -> "IE", "Chinedu" -> "C".
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
