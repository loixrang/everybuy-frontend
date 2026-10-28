import { apiFetch } from './client';
import type { Customer, CreateCustomerInput } from '../../types/customer';

/**
 * Fetch all customers from GET /api/v1/customers
 * Guarded by StaffGuard. The backend returns the full list (no pagination).
 */
export async function fetchCustomers(): Promise<Customer[]> {
  const result = await apiFetch<Customer[]>('/api/v1/customers');
  return Array.isArray(result) ? result : [];
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
