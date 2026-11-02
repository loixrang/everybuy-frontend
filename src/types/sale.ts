import type { StockMovement } from './stock';

/**
 * Selling unit for a sale line. A 'Bag' holds the product's packsPerBag packs;
 * the backend multiplies its quantity by that value to reach packs.
 */
export type SaleUnit = 'Bag' | 'Pack';

/** Payment methods stored by the backend (`payment_method` enum). */
export type PaymentMethod = 'cash' | 'transfer' | 'pos';

/**
 * Status returned by GET /api/v1/sales (list) — note `PARTIAL`.
 * The customer statement uses `PART_PAID` instead; see `normalisePaymentStatus`.
 */
export type SalesListPaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

/** Status returned per sale by GET /api/v1/customers/:id/statement. */
export type StatementPaymentStatus = 'PAID' | 'PART_PAID' | 'UNPAID';

/** Shared UI status after normalising both backend spellings. */
export type PaymentStatus = 'PAID' | 'PART_PAID' | 'UNPAID';

export function normalisePaymentStatus(
  status: SalesListPaymentStatus | StatementPaymentStatus | string,
): PaymentStatus {
  if (status === 'PAID') return 'PAID';
  if (status === 'PARTIAL' || status === 'PART_PAID') return 'PART_PAID';
  return 'UNPAID';
}

/** A sale row as stored by the backend. */
export interface Sale {
  id: string;
  /** Human-readable reference such as `SL-0001`. */
  saleNumber: string;
  customerId: string | null;
  itemsTotal: string; // numeric(14,2)
  requestId: string;
  createdBy: string | null;
  soldAt: string;
}

export interface Payment {
  /** Integer identity column (not a UUID). */
  id: number;
  saleId: string;
  amount: string; // numeric(14,2)
  method: PaymentMethod;
  reference: string | null;
  recordedBy: string | null;
  requestId: string;
  paidAt: string;
}

/**
 * GET /api/v1/sales/:id returns the sale row spread at the top level plus all
 * items and every payment recorded against the sale (oldest first).
 */
export interface SaleDetail extends Sale {
  items: SaleItem[];
  payments: Payment[];
}

/** One row of GET /api/v1/sales (list). */
export interface SalesListRow {
  id: string;
  /** `SL-0001` */
  reference: string;
  createdAt: string;
  customer: { id: string | null; name: string | null } | null;
  itemsTotal: string;
  amountPaid: string;
  balance: string;
  status: SalesListPaymentStatus;
}

/** GET /api/v1/sales paginated envelope, ordered soldAt desc. */
export interface SalesPage {
  data: SalesListRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Filters accepted by GET /api/v1/sales. */
export interface SalesFilters {
  page?: number;
  limit?: number;
  /** Lagos calendar date, `YYYY-MM-DD`. */
  from?: string;
  /** Lagos calendar date, `YYYY-MM-DD`, inclusive. */
  to?: string;
  /** Matches sale number or customer name. */
  q?: string;
  paymentStatus?: SalesListPaymentStatus;
  customerId?: string;
}

/** GET /api/v1/sales/summary (date range optional; all time when omitted). */
export interface SalesSummary {
  salesTotal: string;
  salesCount: number;
  amountPaid: string;
  outstanding: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unit: SaleUnit;
  quantity: number;
  /** Snapshot of the product cost per pack at the time of sale (4 decimals). */
  costPerPack: string | null;
  packsPerUnit: number;
  unitPrice: string; // numeric(14,2), snapshot from the product row
  lineTotal: string; // numeric(14,2)
}

export interface MissingCostSale {
  saleId: string;
  saleNumber: string;
  soldAt: string;
  items: Array<{
    saleItemId: string; productId: string; productName: string; quantity: number;
    packsPerUnit: number; unit: SaleUnit; currentCostPerPack: string | null; repairable: boolean;
  }>;
}

export interface RepairSaleCostsResult {
  saleId: string;
  repaired: Array<{ saleItemId: string; productName: string; costPerPack: string }>;
  couldNotRepair: Array<{ saleItemId: string; productName: string; reason: string }>;
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
 *
 * When `amountPaid` is zero the backend requires `method` to be `cash` and
 * `reference` to be empty.
 */
export interface CreateSaleInput {
  requestId: string;
  customerId?: string;
  /** String with up to 2 decimal places, e.g. "10000" or "10000.50". */
  amountPaid: string;
  method?: PaymentMethod;
  /** Payment reference (transfer id, POS slip number…), max 200 characters. */
  reference?: string;
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
