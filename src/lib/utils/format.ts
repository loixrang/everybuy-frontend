/**
 * Formats a numeric price into a localized Nigerian Naira string.
 * Example: 4500 -> "₦4,500"
 */
export function formatNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₦0';
  }
  const numericVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericVal)) {
    return '₦0';
  }

  // Format with integer decimals if whole number, or up to 2 decimal places
  const formatted = numericVal.toLocaleString('en-NG', {
    minimumFractionDigits: numericVal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `₦${formatted}`;
}

export type StockStatus = {
  label: string;
  tone: 'in-stock' | 'low-stock' | 'out-of-stock';
};

/**
 * Determines stock status based on available pack quantity.
 * Low-stock threshold is 10 packs per design guidelines.
 */
export function getStockStatus(packs: number): StockStatus {
  if (packs <= 0) {
    return { label: 'Out of stock', tone: 'out-of-stock' };
  }
  if (packs <= 10) {
    return { label: 'Low stock', tone: 'low-stock' };
  }
  return { label: 'In stock', tone: 'in-stock' };
}
/**
 * Formats an ISO date string into standard design format.
 * Example: "2026-10-11T12:10:00Z" -> "11 Oct, 12:10"
 */
export function formatMovementDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO date as a short calendar date without a time.
 * Example: "2026-10-11T12:10:00Z" -> "11 Oct 2026"
 */
export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return '—';
  }
}

/**
 * Removes trailing zero decimals from a backend numeric string so it can be
 * used as an input value. Example: "9800.00" -> "9800", "9800.50" -> "9800.50".
 */
export function trimMoney(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/**
 * Returns a human-friendly label for a movement type and reference/note.
 */
export function formatMovementLabel(type: string, note?: string | null): string {
  if (type === 'Sale') return 'Shop sale';
  if (type === 'Receipt') return 'Receipt';
  if (type === 'Adjustment') {
    if (note && note.toLowerCase().includes('stocktake')) {
      return 'Stocktake';
    }
    return 'Adjustment';
  }
  if (type === 'Opening') return 'Opening stock';
  return type;
}
