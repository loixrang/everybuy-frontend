/**
 * Shop settings (`src/settings`).
 *
 * - GET   /api/v1/settings/shop       (StaffGuard) returns the row, including
 *   its `id`. 404 when no settings row exists.
 * - PATCH /api/v1/settings/shop/:id   (OwnerGuard) returns the updated row.
 *
 * The PATCH body is not runtime-validated, so the frontend sends only the
 * fields listed here.
 */
export interface ShopSettings {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  currency: string | null;
  timezone: string | null;
  receiptFooter: string | null;
}

export interface UpdateShopSettingsInput {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string | null;
  timezone?: string | null;
  receiptFooter?: string | null;
}
