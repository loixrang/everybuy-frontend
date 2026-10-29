import { apiFetch } from './client';
import type { Expense, CreateExpenseInput } from '../../types/expense';

/**
 * Fetch every expense (`GET /api/v1/expenses`, StaffGuard).
 * Newest `spentAt` first, not paginated.
 */
export async function fetchExpenses(): Promise<Expense[]> {
  const result = await apiFetch<Expense[]>('/api/v1/expenses');
  return Array.isArray(result) ? result : [];
}

/**
 * Record an expense (`POST /api/v1/expenses`, StaffGuard).
 * `requestId` must be unique per logical action. Repeating the same id with an
 * identical payload replays the stored expense (safe since backend 96e4df5);
 * reusing it with different details answers 409. The UI never retries on its
 * own, so the user stays in control of a second submission.
 */
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return apiFetch<Expense>('/api/v1/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
