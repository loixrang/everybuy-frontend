import { apiFetch } from './client';
import type { MonthlyReport } from '../../types/report';

/**
 * Fetch the monthly shop report from GET /api/v1/reports/monthly.
 * `month` must match YYYY-MM. The backend computes sales, payments, debt,
 * product sales, and closing stock for that Africa/Lagos calendar month.
 */
export async function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  const query = new URLSearchParams({ month });
  return apiFetch<MonthlyReport>(`/api/v1/reports/monthly?${query.toString()}`);
}
