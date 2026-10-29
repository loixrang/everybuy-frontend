import type { StockMovement } from './stock';

/**
 * Selling unit for a sale line. A 'Bag' holds the product's packsPerBag packs;
 * the backend multiplies its quantity by that value to reach packs.
 */
export type SaleUnit = 'Bag' | 'Pack';

export interface Sale {
  id: string;
  customerId: string | null;
  itemsTotal: string; // numeric(14,2)
  requestId: string;
  createdBy: string | null;
  soldAt: string;
}

/** GET /api/v1/sales/:id returns the sale with its saved item snapshots. */
export interface SaleDetail extends Sale {
  items: SaleItem[];
}

/** GET /api/v1/sales paginated envelope, ordered soldAt desc. */
export interface SalesPage {
  data: Sale[];
  page: number;
  limit: number;
  total: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unit: SaleUnit;
  quantity: number;
  packsPerUnit: number;
  unitPrice: string; // numeric(14,2), snapshot from the product row
  lineTotal: string; // numeric(14,2)
}

export interface Payment {
  id: number;
  saleId: string;
  amount: string; // numeric(14,2)
  recordedBy: string | null;
  requestId: string;
  paidAt: string;
}

export interface SaleItemInput {
  productId: string;
  unit: SaleUnit;
  quantity: number;
}

/**
 * POST /api/v1/sales (StaffGuard).
 * `requestId` is a client-generated UUID used for idempotent retries.
 * Prices are never sent: the backend prices each line from the product row
 * (bagPrice for 'Bag', retailPrice for 'Pack').
 */
export interface CreateSaleInput {
  requestId: string;
  customerId?: string;
  /** String with up to 2 decimal places, e.g. "10000" or "10000.50". */
  amountPaid: string;
  items: SaleItemInput[];
}

/**
 * Response of POST /api/v1/sales.
 * Note: `updatedProduct` contains only `{ id }` — no stock balances.
 */
export interface CreateSaleResult {
  sale: Sale;
  items: SaleItem[];
  /** Initial payment record; empty when nothing was paid. */
  payment: Payment[];
  updatedProduct: { id: string }[];
  stockMovement: StockMovement[];
  /** True when the backend replayed a previous identical requestId. */
  replayed: boolean;
}
