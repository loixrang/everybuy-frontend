import type { PackName } from './product';

/** Backend enum `stocktake_status`. */
export type StockTakeStatus = 'Draft' | 'Finalized' | 'Cancelled';

/**
 * Stocktake row returned by `GET /api/v1/stock-takes` and the
 * create/finalize/cancel endpoints.
 */
export interface StockTake {
  id: string;
  name: string;
  status: StockTakeStatus;
  /** Human-readable reference, e.g. `ST-20261030-1A2B3C`. */
  reference: string;
  createdBy: string;
  finalizedBy: string | null;
  createdAt: string | null;
  finalizedAt: string | null;
}

/** Paginated envelope from `GET /api/v1/stock-takes`. */
export interface StockTakePage {
  data: StockTake[];
  page: number;
  limit: number;
  total: number;
}

/** Product and count details for one line of a stocktake. */
export interface StockTakeItem {
  id: string;
  productId: string;
  productName: string;
  packName: PackName;
  size: string | null;
  packsPerBag: number;
  /** Stock balance captured when the stocktake was created. */
  expectedPacks: number;
  /** Stock balance captured when the count was submitted. */
  stockAtCountPacks: number | null;
  countedPacks: number | null;
  countedBy: string | null;
  countedAt: string | null;
}

/** `GET /api/v1/stock-takes/:id` returns the stocktake with its items. */
export interface StockTakeDetail extends StockTake {
  items: StockTakeItem[];
  totalProducts: number;
  countedProducts: number;
}

/** `POST /api/v1/stock-takes` returns the row plus the number of items created. */
export interface CreatedStockTake extends StockTake {
  totalProducts: number;
}

/**
 * `PATCH /api/v1/stock-takes/:id/items/:itemId/count` returns the updated
 * `stocktake_items` row.
 */
export interface StockTakeCountResult {
  id: string;
  stockTakeId: string;
  productId: string;
  expectedPacks: number;
  stockAtCountPacks: number | null;
  countedPacks: number | null;
  countedBy: string | null;
  countedAt: string | null;
  createdAt: string | null;
}
