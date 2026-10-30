import { apiFetch } from './client';
import type {
  CreatedStockTake,
  StockTake,
  StockTakeCountResult,
  StockTakeDetail,
  StockTakePage,
} from '../../types/stocktake';

/**
 * Stocktake API client.
 *
 * Verified against the backend `StockTakesController`:
 * - `StaffGuard` protects every route; finalize and cancel also use
 *   `OwnerGuard`.
 * - `POST /api/v1/stock-takes` accepts only `{ name }` and snapshots every
 *   active product with its current `stockPacks`.
 * - `PATCH .../count` accepts `{ countedPacks }` as a JSON number, not a
 *   string, because the DTO uses `z.number().int()`.
 */

/** Fetch one page of stocktakes, newest first. */
export async function fetchStockTakes(
  page = 1,
  limit = 20,
): Promise<StockTakePage> {
  const result = await apiFetch<StockTakePage>(
    `/api/v1/stock-takes?page=${page}&limit=${limit}`,
  );

  return {
    data: Array.isArray(result?.data) ? result.data : [],
    page: result?.page ?? page,
    limit: result?.limit ?? limit,
    total: result?.total ?? 0,
  };
}

/** Fetch a stocktake with its product lines and count totals. */
export async function fetchStockTake(id: string): Promise<StockTakeDetail> {
  const result = await apiFetch<StockTakeDetail>(`/api/v1/stock-takes/${id}`);

  return {
    ...result,
    items: Array.isArray(result?.items) ? result.items : [],
    totalProducts: result?.totalProducts ?? result?.items?.length ?? 0,
    countedProducts:
      result?.countedProducts ??
      (Array.isArray(result?.items)
        ? result.items.filter((item) => item.countedPacks !== null).length
        : 0),
  };
}

/**
 * Create a stocktake. The backend includes every active product, including
 * products with zero stock, and records the creator from the session.
 */
export async function createStockTake(input: {
  name: string;
}): Promise<CreatedStockTake> {
  return apiFetch<CreatedStockTake>('/api/v1/stock-takes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Record or replace the physical count for one item. The backend locks the
 * stocktake and product rows, captures `stockAtCountPacks`, and never changes
 * product stock here.
 */
export async function recordStockTakeCount(
  stockTakeId: string,
  itemId: string,
  countedPacks: number,
): Promise<StockTakeCountResult> {
  return apiFetch<StockTakeCountResult>(
    `/api/v1/stock-takes/${stockTakeId}/items/${itemId}/count`,
    {
      method: 'PATCH',
      body: JSON.stringify({ countedPacks }),
    },
  );
}

/** Approve a draft stocktake and apply its reconciliation (owner only). */
export async function finalizeStockTake(id: string): Promise<StockTake> {
  return apiFetch<StockTake>(`/api/v1/stock-takes/${id}/finalize`, {
    method: 'POST',
  });
}

/** Cancel a draft stocktake without changing stock (owner only). */
export async function cancelStockTake(id: string): Promise<StockTake> {
  return apiFetch<StockTake>(`/api/v1/stock-takes/${id}/cancel`, {
    method: 'POST',
  });
}
