import { describe, expect, test } from 'bun:test';
import { ApiError } from './api/client';
import {
  countedByLabel,
  countedPacksFromBags,
  describeStockTakeError,
  differenceFromExpected,
  formatPackDifference,
  isDraftStockTake,
  MAX_COUNTED_PACKS,
  pluralPacks,
  splitCountedPacks,
  stockTakeProgress,
  stockTakeStatusLabel,
  stockTakeStatusTone,
  validateCountInput,
} from './stocktakes';

describe('stocktake status presentation', () => {
  test('maps the backend statuses to shop language', () => {
    expect(stockTakeStatusLabel('Draft')).toBe('In progress');
    expect(stockTakeStatusLabel('Finalized')).toBe('Approved');
    expect(stockTakeStatusLabel('Cancelled')).toBe('Cancelled');
  });

  test('gives each status a distinct tone', () => {
    expect(stockTakeStatusTone('Draft')).toBe('draft');
    expect(stockTakeStatusTone('Finalized')).toBe('finalized');
    expect(stockTakeStatusTone('Cancelled')).toBe('cancelled');
  });

  test('only a draft stocktake accepts counts', () => {
    expect(isDraftStockTake('Draft')).toBe(true);
    expect(isDraftStockTake('Finalized')).toBe(false);
    expect(isDraftStockTake('Cancelled')).toBe(false);
  });
});

describe('pack arithmetic', () => {
  test('splits a pack total into whole bags and loose packs', () => {
    expect(splitCountedPacks(61, 6)).toEqual({ bags: 10, loosePacks: 1 });
    expect(splitCountedPacks(0, 12)).toEqual({ bags: 0, loosePacks: 0 });
  });

  test('falls back to loose packs when the bag size is invalid', () => {
    expect(splitCountedPacks(5, 0)).toEqual({ bags: 0, loosePacks: 5 });
    expect(splitCountedPacks(-3, 6)).toEqual({ bags: 0, loosePacks: 0 });
  });

  test('combines bags and loose packs into the backend pack total', () => {
    expect(countedPacksFromBags(10, 1, 6)).toBe(61);
    expect(countedPacksFromBags(0, 0, 6)).toBe(0);
  });

  test('formats signed differences with singular and plural units', () => {
    expect(formatPackDifference(0)).toBe('0');
    expect(formatPackDifference(1)).toBe('+1 pack');
    expect(formatPackDifference(-1)).toBe('-1 pack');
    expect(formatPackDifference(-4)).toBe('-4 packs');
    expect(pluralPacks(1)).toBe('pack');
    expect(pluralPacks(2)).toBe('packs');
  });
});

describe('count validation', () => {
  test('accepts whole bags and loose packs', () => {
    expect(
      validateCountInput({ bags: '10', loosePacks: '1', packsPerBag: 6 }),
    ).toEqual({ valid: true, countedPacks: 61 });
  });

  test('accepts zero, which is a real physical count', () => {
    expect(
      validateCountInput({ bags: '0', loosePacks: '0', packsPerBag: 6 }),
    ).toEqual({ valid: true, countedPacks: 0 });
  });

  test('rejects blank, negative, decimal and non-numeric input', () => {
    for (const bags of ['', '  ', '-1', '1.5', 'ten']) {
      const result = validateCountInput({
        bags,
        loosePacks: '0',
        packsPerBag: 6,
      });
      expect(result.valid).toBe(false);
    }
  });

  test('rejects a product without a valid bag conversion', () => {
    const result = validateCountInput({
      bags: '1',
      loosePacks: '0',
      packsPerBag: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('bag conversion');
    }
  });

  test('rejects totals larger than a PostgreSQL integer', () => {
    const result = validateCountInput({
      bags: String(MAX_COUNTED_PACKS),
      loosePacks: '0',
      packsPerBag: 2,
    });
    expect(result.valid).toBe(false);
  });
});

describe('difference from expected stock', () => {
  test('is null until the item is counted', () => {
    expect(
      differenceFromExpected({ countedPacks: null, expectedPacks: 62 }),
    ).toBeNull();
  });

  test('is the signed gap between counted and expected packs', () => {
    expect(
      differenceFromExpected({ countedPacks: 61, expectedPacks: 62 }),
    ).toBe(-1);
    expect(
      differenceFromExpected({ countedPacks: 98, expectedPacks: 97 }),
    ).toBe(1);
    expect(
      differenceFromExpected({ countedPacks: 8, expectedPacks: 8 }),
    ).toBe(0);
  });
});

describe('progress', () => {
  test('rounds counted products into a percentage', () => {
    expect(stockTakeProgress(0, 6)).toBe(0);
    expect(stockTakeProgress(6, 6)).toBe(100);
    expect(stockTakeProgress(1, 3)).toBe(33);
  });

  test('never divides by zero or exceeds its bounds', () => {
    expect(stockTakeProgress(0, 0)).toBe(0);
    expect(stockTakeProgress(9, 6)).toBe(100);
    expect(stockTakeProgress(-1, 6)).toBe(0);
  });
});

describe('counter label', () => {
  test('names the current user and shortens other staff ids', () => {
    expect(countedByLabel(null, 'user-1')).toBe('—');
    expect(countedByLabel('user-1', 'user-1')).toBe('You');
    expect(countedByLabel('abcdef1234567890', 'user-1')).toBe('Staff #abcdef12');
  });
});

describe('stocktake error copy', () => {
  test('explains an owner-only approval', () => {
    expect(describeStockTakeError(new ApiError('Forbidden', 403), 'finalize')).toBe(
      'Only an owner can approve or cancel a stocktake.',
    );
  });

  test('surfaces the backend uncounted-products message on approval', () => {
    const message = describeStockTakeError(
      new ApiError('3 products have not been counted.', 400),
      'finalize',
    );
    expect(message).toContain('3 products have not been counted.');
    expect(message).toContain('approve again');
  });

  test('handles closed stocktakes, expired sessions and throttling', () => {
    expect(describeStockTakeError(new ApiError('Conflict', 409), 'count')).toContain(
      'no longer in progress',
    );
    expect(describeStockTakeError(new ApiError('Unauthorized', 401), 'load')).toContain(
      'session has expired',
    );
    expect(describeStockTakeError(new ApiError('Throttled', 429), 'load')).toContain(
      'Too many requests',
    );
  });

  test('falls back to a network message for unknown failures', () => {
    expect(describeStockTakeError(new Error('boom'), 'load')).toContain(
      'could not reach Everybuy',
    );
  });
});
