/**
 * GET /api/v1/reports/monthly?month=YYYY-MM (StaffGuard).
 * All figures are computed by the backend for the Africa/Lagos calendar month.
 */
export interface MonthlyReportProductSales {
  productId: string;
  productName: string;
  /** Bags (backend `Bag` unit) sold in the month. */
  bagsSold: number;
  /** Individual packs sold in the month. */
  retailPacksSold: number;
  /** Bags converted to packs plus retail packs. */
  totalPacksSold: number;
}

export interface MonthlyReportClosingStock {
  productId: string;
  productName: string;
  closingPacks: number;
}

export interface MonthlyReport {
  month: string;
  timezone: string;
  salesTotal: string;
  moneyReceived: string;
  outstandingDebtAtMonthEnd: string;
  productsSold: MonthlyReportProductSales[];
  closingStock: MonthlyReportClosingStock[];
}

/** One row of GET /api/v1/reports/overview `recentSales`. */
export interface OverviewRecentSale {
  id: string;
  reference: string;
  soldAt: string;
  customer: { id: string; name: string } | null;
  itemsTotal: string;
  amountPaid: string;
  balance: string;
}

export interface LowStockProduct {
  productId: string;
  name: string;
  packsAvailable: number;
}

/**
 * GET /api/v1/reports/overview (StaffGuard).
 * "Today" is the Africa/Lagos calendar day. `lowStock` uses a fixed threshold
 * of 10 packs; `recentSales` is limited to the last 5.
 */
export interface DailyOverview {
  salesToday: { count: number; total: string };
  paymentsReceived: string;
  customerBalances: string;
  lowStock: LowStockProduct[];
  recentSales: OverviewRecentSale[];
}

/**
 * GET /api/v1/reports/profit?month=YYYY-MM (StaffGuard).
 * 409 when any sale in the month has no recorded cost.
 */
export interface ProfitReport {
  revenue: string;
  cogs: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
}
