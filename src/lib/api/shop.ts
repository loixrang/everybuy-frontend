import { apiFetch } from './client';
import type { ShopSettings, UpdateShopSettingsInput } from '../../types/shop';

/**
 * Read the shop settings row (`GET /api/v1/settings/shop`, StaffGuard).
 * Returns `null` when no row exists (backend 404).
 */
export async function fetchShopSettings(): Promise<ShopSettings | null> {
  try {
    return await apiFetch<ShopSettings>('/api/v1/settings/shop');
  } catch (error) {
    if (typeof error === 'object' && error && 'status' in error && (error as { status: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Update the shop settings row (`PATCH /api/v1/settings/shop/:id`, OwnerGuard).
 * The backend does not validate this body at runtime, so only known fields
 * are sent.
 */
export async function updateShopSettings(
  id: string,
  input: UpdateShopSettingsInput,
): Promise<ShopSettings> {
  return apiFetch<ShopSettings>(
    `/api/v1/settings/shop/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}
