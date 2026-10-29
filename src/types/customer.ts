import type { Payment, SaleItem } from './sale';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/v1/customers (StaffGuard).
 * Derived from the customers insert schema: only `name` is required.
 */
export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
}

/**
 * PATCH /api/v1/customers/update/:id (StaffGuard).
 * `updateCustomerSchema` is the partial insert schema, so every field is optional.
 */
export interface UpdateCustomerInput {
  name?: string;
  phone?: string | null;
  active?: boolean;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PART_PAID';

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
  paymentStatus: PaymentStatus;
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
