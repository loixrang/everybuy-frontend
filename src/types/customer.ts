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
