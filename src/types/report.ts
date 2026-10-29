/**
 * GET /api/v1/reports/monthly?month=YYYY-MM (StaffGuard).
 * All figures are computed by the backend for the Africa/Lagos calendar month.
 */
export interface MonthlyReportProductSales {
  productId: string;
  productName: string;
  /** Cartons (backend `Bag` unit) sold in the month. */
  bagsSold: number;
  /** Individual packs sold in the month. */
  retailPacksSold: number;
  /** Cartons converted to packs plus retail packs. */
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
