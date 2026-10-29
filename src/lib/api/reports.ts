import { apiFetch } from './client';
import type { DailyOverview, MonthlyReport, ProfitReport } from '../../types/report';

/**
 * Fetch today's dashboard snapshot from GET /api/v1/reports/overview.
 * "Today" is the Africa/Lagos calendar day. Low stock uses a fixed threshold
 * of 10 packs; only the five most recent sales are returned.
 */
export async function fetchDailyOverview(): Promise<DailyOverview> {
  return apiFetch<DailyOverview>('/api/v1/reports/overview');
}

/**
 * Fetch the monthly shop report from GET /api/v1/reports/monthly.
 * `month` must match YYYY-MM. The backend computes sales, payments, debt,
 * product sales, and closing stock for that Africa/Lagos calendar month.
 */
export async function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  const query = new URLSearchParams({ month });
  return apiFetch<MonthlyReport>(`/api/v1/reports/monthly?${query.toString()}`);
}

/**
 * Fetch revenue, COGS, expenses and profit for a month from
 * GET /api/v1/reports/profit?month=YYYY-MM.
 * Answers 409 when any sale in the month has no recorded cost — the UI must
 * surface that as a limitation, not as zero profit.
 */
export async function fetchProfitReport(month: string): Promise<ProfitReport> {
  const query = new URLSearchParams({ month });
  return apiFetch<ProfitReport>(`/api/v1/reports/profit?${query.toString()}`);
}
