import { apiFetch, ApiError } from './client';
import type { Me } from '../../types/me';

/**
 * Read the signed-in user's staff profile (`GET /api/v1/me`, StaffGuard).
 * The backend returns an array with one item. 403/404 means the account has
 * no active staff record, so this resolves to `null` instead of throwing.
 */
export async function fetchMe(): Promise<Me | null> {
  try {
    const result = await apiFetch<Me[] | Me>('/api/v1/me');
    if (Array.isArray(result)) return result[0] ?? null;
    return result ?? null;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

/**
 * Update the signed-in user's display name (`PATCH /api/v1/me`, StaffGuard).
 * The backend returns the full user row; only the name is sent.
 */
export async function updateMyName(name: string): Promise<void> {
  await apiFetch('/api/v1/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}
