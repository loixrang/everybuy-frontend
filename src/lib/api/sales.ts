import { apiFetch } from './client';
import type { CreateSaleInput, CreateSaleResult } from '../../types/sale';

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
