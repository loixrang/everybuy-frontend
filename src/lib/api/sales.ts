import { apiFetch } from './client';
import type {
  CreateSaleInput,
  CreateSaleResult,
  SaleDetail,
  SalesPage,
} from '../../types/sale';

/**
 * Fetch one page of sales from GET /api/v1/sales (StaffGuard).
 * The backend supports only `page` and `limit`; there is no search,
 * customer filter, or payment-state filter.
 */
export async function fetchSales(page = 1, limit = 20): Promise<SalesPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<SalesPage>(`/api/v1/sales?${query.toString()}`);
}

/**
 * Fetch one sale with its item snapshots from GET /api/v1/sales/:id.
 * The response does not include payments or balances; those come from the
 * customer statement when the sale has a customer.
 */
export async function fetchSale(id: string): Promise<SaleDetail> {
  return apiFetch<SaleDetail>(`/api/v1/sales/${encodeURIComponent(id)}`);
}

/**
 * Record a sale via POST /api/v1/sales.
 * Guarded by StaffGuard (staff and owner).
 * `requestId` must be a fresh UUID per logical submission; the backend replays
 * the original result if the same requestId is retried with the same payload,
 * and rejects (409) a reused requestId with a different payload.
 */
export async function createSale(
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  return await apiFetch<CreateSaleResult>('/api/v1/sales', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
