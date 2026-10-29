/**
 * Verified expense shapes (`src/expenses`).
 *
 * - POST /api/v1/expenses (StaffGuard) requires a client-generated `requestId`.
 * - GET  /api/v1/expenses (StaffGuard) returns every expense, newest `spentAt`
 *   first, not paginated.
 *
 * Since backend commit 96e4df5 a repeated `requestId` with an identical payload
 * replays safely: the row is inserted with `onConflictDoNothing` and the audit
 * entry is written only after a successful insert. A `requestId` reused with a
 * different payload answers 409. The UI still never auto-retries creation; the
 * user decides after seeing the error.
 */
export interface Expense {
  id: string;
  requestId: string;
  title: string;
  category: string;
  amount: string; // numeric(14,2)
  notes: string | null;
  spentAt: string;
  recordedBy: string;
  createdAt: string;
}

/**
 * `spentAt` must be an ISO datetime **with an offset** (e.g.
 * `2026-10-28T09:30:00+01:00`). Max 2 decimals on `amount`.
 */
export interface CreateExpenseInput {
  requestId: string;
  title: string;
  category: string;
  amount: string;
  notes?: string;
  spentAt?: string;
}
