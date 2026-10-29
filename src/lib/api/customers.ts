import { apiFetch } from './client';
import type {
  Customer,
  CustomerListItem,
  CreateCustomerInput,
  CustomerStatement,
  RecordRepaymentInput,
  RecordRepaymentResult,
  UpdateCustomerInput,
} from '../../types/customer';

/**
 * Fetch all customers from GET /api/v1/customers
 * Guarded by StaffGuard. The backend returns the full list (no pagination),
 * newest first, including each customer's outstanding `balance`,
 * `lastSaleAt` and `totalPurchases` (numeric strings).
 */
export async function fetchCustomers(): Promise<CustomerListItem[]> {
  const result = await apiFetch<CustomerListItem[]>('/api/v1/customers');
  return Array.isArray(result) ? result : [];
}

/**
 * Fetch one customer from GET /api/v1/customers/:id
 * The backend returns a `.where()` array, so an unknown id yields [].
 */
export async function fetchCustomer(id: string): Promise<Customer | null> {
  const result = await apiFetch<Customer[]>(`/api/v1/customers/${encodeURIComponent(id)}`);
  return Array.isArray(result) ? (result[0] ?? null) : null;
}

/**
 * Create a customer via POST /api/v1/customers
 * Guarded by StaffGuard. Only `name` is required by the backend.
 */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer[]> {
  // The backend returns the drizzle .returning() array.
  const result = await apiFetch<Customer[]>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return Array.isArray(result) ? result : [];
}

/**
 * Update a customer via PATCH /api/v1/customers/update/:id
 * The backend returns the drizzle `.returning()` array.
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer | null> {
  const result = await apiFetch<Customer[]>(
    `/api/v1/customers/update/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return Array.isArray(result) ? (result[0] ?? null) : null;
}

/**
 * Fetch a customer's statement from GET /api/v1/customers/:id/statement
 * The backend computes each sale's paid amount, balance, status, and the
 * customer-level totals inside one repeatable-read transaction.
 */
export async function fetchCustomerStatement(
  id: string,
): Promise<CustomerStatement> {
  return apiFetch<CustomerStatement>(
    `/api/v1/customers/${encodeURIComponent(id)}/statement`,
  );
}

/**
 * Record a repayment via POST /api/v1/customers/:id/repayments
 * Guarded by StaffGuard. The backend rejects overpayments and repaid sales
 * and replays a previous identical `requestId` instead of double-charging.
 */
export async function recordRepayment(
  customerId: string,
  input: RecordRepaymentInput,
): Promise<RecordRepaymentResult> {
  return apiFetch<RecordRepaymentResult>(
    `/api/v1/customers/${encodeURIComponent(customerId)}/repayments`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
