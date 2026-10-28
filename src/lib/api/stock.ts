import { apiFetch } from './client';
import type {
  StockMovement,
  StockMovementsPage,
  Supplier,
  CreateStockAdditionInput,
  CreateStockAdjustmentInput,
  StockMutationResult,
} from '../../types/stock';

/**
 * Fetch a page of stock movements from GET /api/v1/stock/movements
 * Backend defaults: page 1, limit 20 (max 100), ordered newest first.
 */
export async function fetchStockMovements(
  page = 1,
  limit = 20,
): Promise<StockMovementsPage> {
  const result = await apiFetch<StockMovementsPage>(
    `/api/v1/stock/movements?page=${page}&limit=${limit}`,
  );
  return {
    data: Array.isArray(result?.data) ? result.data : [],
    page: result?.page ?? page,
    limit: result?.limit ?? limit,
    total: result?.total ?? 0,
  };
}

/**
 * Fetch all stock movement pages (client-side accumulation).
 * The backend has no product filter, so callers filter the result themselves.
 * Capped at maxPages to avoid unbounded requests on large ledgers.
 */
export async function fetchAllStockMovements(
  maxPages = 10,
): Promise<StockMovement[]> {
  const all: StockMovement[] = [];
  let page = 1;
  let total = 0;

  do {
    const result = await fetchStockMovements(page, 100);
    all.push(...result.data);
    total = result.total;
    page += 1;
  } while (all.length < total && page <= maxPages);

  return all;
}

/**
 * Fetch a single stock movement from GET /api/v1/stock/movements/:id
 * The id must be a UUID; the backend returns 404 when not found.
 */
export async function fetchStockMovementById(
  id: string,
): Promise<StockMovement | null> {
  const result = await apiFetch<StockMovement>(
    `/api/v1/stock/movements/${id}`,
  );
  return result ?? null;
}

/**
 * Record a stock addition (e.g. stock receipt) via POST /api/v1/stock/additions
 * Guarded by StaffGuard (staff / owner).
 * `requestId` must be a fresh UUID per logical submission; the backend replays
 * the original result if the same requestId is retried, preventing duplicates.
 */
export async function createStockAddition(
  input: CreateStockAdditionInput,
): Promise<StockMutationResult> {
  return await apiFetch<StockMutationResult>('/api/v1/stock/additions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Record a stock adjustment via POST /api/v1/stock/adjustments
 * Guarded by OwnerGuard (owner only).
 * `requestId` works the same idempotency way as additions.
 */
export async function createStockAdjustment(
  input: CreateStockAdjustmentInput,
): Promise<StockMutationResult> {
  return await apiFetch<StockMutationResult>('/api/v1/stock/adjustments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Fetch all suppliers from GET /api/v1/suppliers
 * Guarded by StaffGuard
 */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const result = await apiFetch<Supplier[]>('/api/v1/suppliers');
  return Array.isArray(result) ? result : [];
}
