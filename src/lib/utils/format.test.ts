import { describe, expect, test } from 'bun:test';
import {
  currentLagosMonth,
  formatMonthLabel,
  formatMovementDate,
  formatMovementLabel,
  formatNaira,
  formatShortDate,
  getStockStatus,
  shiftMonth,
  trimMoney,
} from './format';

describe('formatNaira', () => {
  test('formats whole naira with grouping', () => {
    expect(formatNaira(4500)).toBe('₦4,500');
    expect(formatNaira('19800.00')).toBe('₦19,800');
  });

  test('keeps up to two decimals for fractional amounts', () => {
    expect(formatNaira(4500.5)).toBe('₦4,500.50');
    expect(formatNaira('19.05')).toBe('₦19.05');
  });

  test('falls back to zero for empty or invalid values', () => {
    expect(formatNaira(null)).toBe('₦0');
    expect(formatNaira(undefined)).toBe('₦0');
    expect(formatNaira('')).toBe('₦0');
    expect(formatNaira('not-money')).toBe('₦0');
  });
});

describe('getStockStatus', () => {
  test('classifies out of stock, low stock and in stock', () => {
    expect(getStockStatus(0).tone).toBe('out-of-stock');
    expect(getStockStatus(-5).tone).toBe('out-of-stock');
    expect(getStockStatus(1).tone).toBe('low-stock');
    expect(getStockStatus(10).tone).toBe('low-stock');
    expect(getStockStatus(11).tone).toBe('in-stock');
  });
});

describe('date formatting', () => {
  // Built in local time so the assertions hold in any timezone.
  const date = new Date(2026, 9, 11, 10, 42, 0).toISOString();

  test('formats movement dates as "11 Oct, 10:42"', () => {
    expect(formatMovementDate(date)).toBe('11 Oct, 10:42');
  });

  test('formats short dates as "11 Oct 2026"', () => {
    expect(formatShortDate(date)).toBe('11 Oct 2026');
  });

  test('returns a dash for missing or invalid dates', () => {
    expect(formatMovementDate(null)).toBe('—');
    expect(formatMovementDate('not-a-date')).toBe('—');
    expect(formatShortDate(undefined)).toBe('—');
  });
});

describe('report months', () => {
  test('uses the Africa/Lagos month, not the browser month', () => {
    // 23:30 UTC on 31 October is 00:30 on 1 November in Lagos (UTC+1).
    expect(currentLagosMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(currentLagosMonth(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10');
  });

  test('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
    expect(shiftMonth('2026-07', -12)).toBe('2025-07');
  });

  test('labels months in a stable timezone', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2027-01')).toBe('January 2027');
  });
});

describe('trimMoney', () => {
  test('drops trailing zeros from backend numeric strings', () => {
    expect(trimMoney('9800.00')).toBe('9800');
    expect(trimMoney('9800.50')).toBe('9800.5');
    expect(trimMoney('19.05')).toBe('19.05');
  });
});

describe('formatMovementLabel', () => {
  test('maps movement types to shop language', () => {
    expect(formatMovementLabel('Sale')).toBe('Shop sale');
    expect(formatMovementLabel('Receipt')).toBe('Receipt');
    expect(formatMovementLabel('Opening')).toBe('Opening stock');
    expect(formatMovementLabel('Adjustment')).toBe('Adjustment');
    expect(formatMovementLabel('Adjustment', 'Monthly stocktake count')).toBe(
      'Stocktake',
    );
    expect(formatMovementLabel('Custom')).toBe('Custom');
  });
});
