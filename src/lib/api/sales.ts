import { apiFetch } from './client';
import type {
  CreateSaleInput,
  CreateSaleResult,
  SaleDetail,
  SalesFilters,
  SalesPage,
  SalesSummary,
} from '../../types/sale';

/**
 * Fetch one page of sales from GET /api/v1/sales (StaffGuard).
 * Supports date range (`from`/`to`, Lagos calendar dates), free-text search
 * (`q`, matches sale number or customer name), payment status and customer.
 * Rows include `id`, so list → detail links are possible.
 */
export async function fetchSales(filters: SalesFilters = {}): Promise<SalesPage> {
  const query = new URLSearchParams();
  if (filters.page !== undefined) query.set('page', String(filters.page));
  if (filters.limit !== undefined) query.set('limit', String(filters.limit));
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.q) query.set('q', filters.q);
  if (filters.paymentStatus) query.set('paymentStatus', filters.paymentStatus);
  if (filters.customerId) query.set('customerId', filters.customerId);

  const qs = query.toString();
  return apiFetch<SalesPage>(`/api/v1/sales${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch totals for a date range from GET /api/v1/sales/summary (StaffGuard).
 * Both dates are optional; omit them for all-time totals.
 */
export async function fetchSalesSummary(
  from?: string,
  to?: string,
): Promise<SalesSummary> {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const qs = query.toString();
  return apiFetch<SalesSummary>(`/api/v1/sales/summary${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch one sale with its item snapshots and every payment
 * (GET /api/v1/sales/:id, StaffGuard).
 * The sale row is spread at the top level; `payments` is ordered by `paidAt`.
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
 *
 * Prices are not sent — the backend prices each line from the product row.
 */
export async function createSale(
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  return await apiFetch<CreateSaleResult>('/api/v1/sales', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
