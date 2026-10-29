import type { Payment, SaleItem, StatementPaymentStatus } from './sale';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Row returned by GET /api/v1/customers.
 * The list is not paginated and is ordered newest first. Balances are
 * computed by the backend across every sale for the customer.
 */
export interface CustomerListItem extends Customer {
  balance: string; // numeric string, total outstanding
  lastSaleAt: string | null;
  totalPurchases: string; // numeric string, sum of itemsTotal
}

/**
 * POST /api/v1/customers (StaffGuard).
 * Only `name` is required; `phone`, `address` and `notes` are nullable.
 */
export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * PATCH /api/v1/customers/update/:id (StaffGuard).
 * `updateCustomerSchema` is the partial insert schema, so every field is optional.
 */
export interface UpdateCustomerInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  active?: boolean;
}

/**
 * One sale inside GET /api/v1/customers/:id/statement.
 * Amounts are computed by the backend in integer kobo and returned as
 * numeric strings with two decimal places.
 */
export interface StatementSale {
  id: string;
  soldAt: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  paymentStatus: StatementPaymentStatus;
  items: SaleItem[];
  payments: Payment[];
}

export interface CustomerStatementTotals {
  salesTotal: string;
  moneyReceived: string;
  outstandingDebt: string;
}

/**
 * GET /api/v1/customers/:id/statement (StaffGuard).
 * The backend computes payment status and totals; the frontend must not
 * derive authoritative balances from partial data.
 */
export interface CustomerStatement {
  customer: Customer;
  totals: CustomerStatementTotals;
  sales: StatementSale[];
}

/**
 * POST /api/v1/customers/:id/repayments (StaffGuard).
 * `requestId` is a client-generated UUID used for idempotent retries.
 */
export interface RecordRepaymentInput {
  requestId: string;
  saleId: string;
  /** String with up to 2 decimal places, e.g. "4000" or "4000.50". */
  amount: string;
}

/** Response of POST /api/v1/customers/:id/repayments. */
export interface RecordRepaymentResult {
  payment: Payment;
  saleId: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
}
