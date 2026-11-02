import { ApiError } from './api/client';
import type { StockTakeItem, StockTakeStatus } from '../types/stocktake';

/**
 * Stocktake presentation and input rules shared by the pages, dialogs and
 * their tests.
 *
 * The backend remains authoritative for status transitions, authorization and
 * reconciliation. These helpers mirror the verified count rules for immediate
 * feedback and keep user-facing copy in one place.
 */

/** Largest value PostgreSQL `integer` accepts for a count. */
export const MAX_COUNTED_PACKS = 2_147_483_647;

/** Matches the backend `findStockTakesSchema` default. */
export const STOCK_TAKE_PAGE_SIZE = 20;

export type StockTakeStatusTone = 'draft' | 'finalized' | 'cancelled';

const STATUS_LABELS: Record<StockTakeStatus, string> = {
  Draft: 'In progress',
  Finalized: 'Approved',
  Cancelled: 'Cancelled',
};

const STATUS_TONES: Record<StockTakeStatus, StockTakeStatusTone> = {
  Draft: 'draft',
  Finalized: 'finalized',
  Cancelled: 'cancelled',
};

export function stockTakeStatusLabel(status: StockTakeStatus): string {
  return STATUS_LABELS[status];
}

export function stockTakeStatusTone(status: StockTakeStatus): StockTakeStatusTone {
  return STATUS_TONES[status];
}

export function isDraftStockTake(status: StockTakeStatus): boolean {
  return status === 'Draft';
}

/** Formats a signed difference, e.g. `+1 pack`, `-2 packs`, `0`. */
export function formatPackDifference(difference: number): string {
  if (difference === 0) return '0';
  const sign = difference > 0 ? '+' : '-';
  return `${sign}${Math.abs(difference)} ${pluralPacks(Math.abs(difference))}`;
}

export function pluralPacks(count: number): string {
  return count === 1 ? 'pack' : 'packs';
}

/**
 * Difference between the physical count and the stock expected when the
 * stocktake was created. Null until the item has been counted.
 */
export function differenceFromExpected(
  item: Pick<StockTakeItem, 'countedPacks' | 'expectedPacks'>,
): number | null {
  return item.countedPacks === null
    ? null
    : item.countedPacks - item.expectedPacks;
}

/** Counted packs expressed as whole bags plus loose packs. */
export function splitCountedPacks(
  countedPacks: number,
  packsPerBag: number,
): { bags: number; loosePacks: number } {
  if (
    !Number.isInteger(countedPacks) ||
    countedPacks < 0 ||
    !Number.isInteger(packsPerBag) ||
    packsPerBag <= 0
  ) {
    return { bags: 0, loosePacks: Math.max(0, countedPacks) };
  }

  return {
    bags: Math.floor(countedPacks / packsPerBag),
    loosePacks: countedPacks % packsPerBag,
  };
}

/** Total packs from whole bags plus loose packs. */
export function countedPacksFromBags(
  bags: number,
  loosePacks: number,
  packsPerBag: number,
): number {
  return bags * packsPerBag + loosePacks;
}

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export type CountValidation =
  | { valid: true; countedPacks: number }
  | { valid: false; message: string };

/**
 * Validates the count dialog's bag and loose-pack inputs and converts them to
 * the single pack total the backend accepts.
 */
export function validateCountInput(input: {
  bags: string;
  loosePacks: string;
  packsPerBag: number;
}): CountValidation {
  const bags = parseWholeNumber(input.bags);
  const loosePacks = parseWholeNumber(input.loosePacks);

  if (bags === null) {
    return { valid: false, message: 'Enter a whole number of bags (0 or more).' };
  }
  if (loosePacks === null) {
    return {
      valid: false,
      message: 'Enter a whole number of loose packs (0 or more).',
    };
  }
  if (!Number.isInteger(input.packsPerBag) || input.packsPerBag <= 0) {
    return {
      valid: false,
      message: 'This product has no valid bag conversion. Ask an owner to fix it.',
    };
  }

  const countedPacks = countedPacksFromBags(
    bags,
    loosePacks,
    input.packsPerBag,
  );

  if (countedPacks > MAX_COUNTED_PACKS) {
    return {
      valid: false,
      message: `The total count must be ${MAX_COUNTED_PACKS.toLocaleString()} packs or fewer.`,
    };
  }

  return { valid: true, countedPacks };
}

/** Percentage of items counted, rounded for a progress bar width. */
export function stockTakeProgress(countedProducts: number, totalProducts: number): number {
  if (totalProducts <= 0) return 0;
  const ratio = (countedProducts / totalProducts) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

/**
 * Label for who recorded a count. The backend stores a user id and exposes no
 * name lookup, so the current user is named and everyone else is shortened.
 */
export function countedByLabel(
  countedBy: string | null,
  currentUserId: string | undefined,
): string {
  if (!countedBy) return '—';
  if (currentUserId && countedBy === currentUserId) return 'You';
  return `Staff #${countedBy.slice(0, 8)}`;
}

export type StockTakeAction =
  | 'load'
  | 'create'
  | 'count'
  | 'finalize'
  | 'cancel';

const NETWORK_MESSAGE =
  'We could not reach Everybuy. Check your connection and try again.';

/**
 * Maps stocktake failures to safe, actionable copy. Backend 400 messages for
 * finalization are specific (for example how many products remain uncounted),
 * so they are shown when present.
 */
export function describeStockTakeError(
  error: unknown,
  action: StockTakeAction,
): string {
  if (!(error instanceof ApiError)) {
    return NETWORK_MESSAGE;
  }

  if (error.status === 401) {
    return 'Your session has expired. Sign in again to continue.';
  }
  if (error.status === 403) {
    if (action === 'finalize' || action === 'cancel') {
      return 'Only an owner can approve or cancel a stocktake.';
    }
    return 'You do not have permission to do that.';
  }
  if (error.status === 404) {
    return action === 'load'
      ? 'This stocktake could not be found. It may have been removed.'
      : 'This stocktake is no longer available. Reload the page and try again.';
  }
  if (error.status === 409) {
    if (
      action === 'finalize' &&
      error.message.startsWith('Record the acquisition cost per pack')
    ) {
      return `${error.message} Enter the known cost in product setup, then reload this stocktake.`;
    }
    return 'This stocktake is no longer in progress. Reload the page to see its current status.';
  }
  if (error.status === 429) {
    return 'Too many requests. Wait a moment and try again.';
  }
  if (error.status === 400) {
    if (action === 'finalize' && error.message) {
      return `${error.message} Count the remaining products, then approve again.`;
    }
    if (action === 'create') {
      return error.message
        ? `${error.message} Add an active product before starting a stocktake.`
        : 'A stocktake needs at least one active product.';
    }
    return error.message || 'Check the count and try again.';
  }
  if (error.status >= 500) {
    return 'Everybuy could not complete this action right now. Try again shortly.';
  }

  return error.message || 'Something went wrong. Try again.';
}
