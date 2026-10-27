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
