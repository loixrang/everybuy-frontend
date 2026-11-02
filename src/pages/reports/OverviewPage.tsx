import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDailyOverview,
  fetchMonthlyReport,
  fetchProfitReport,
} from '../../lib/api/reports';
import { ApiError } from '../../lib/api/client';
import {
  currentLagosMonth,
  formatMonthLabel,
  formatMovementDate,
  formatNaira,
  shiftMonth,
} from '../../lib/utils/format';
import { toKobo } from '../../lib/utils/money';
import {
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshCwIcon,
} from '../../components/ui/Icons';
import type {
  DailyOverview,
  MonthlyReport,
  ProfitReport,
} from '../../types/report';

const MONTH_PATTERN = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

type Tab = 'today' | 'monthly' | 'profit';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'today', label: 'Today', hint: 'Today at a glance' },
  { id: 'monthly', label: 'Monthly', hint: 'Sales, payments and stock' },
  { id: 'profit', label: 'Profit', hint: 'Revenue, cost and expenses' },
];

export function OverviewPage() {
  const thisMonth = useMemo(() => currentLagosMonth(), []);
  const [tab, setTab] = useState<Tab>('today');
  const [month, setMonth] = useState(thisMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Overview
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Shop performance from the backend · Africa/Lagos timezone
          </p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0 self-start"
        >
          <PlusIcon size={16} />
          Record sale
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Report type"
        className="grid grid-cols-3 gap-1 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-1"
      >
        {TABS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            id={`report-tab-${candidate.id}`}
            aria-selected={tab === candidate.id}
            aria-controls={`report-panel-${candidate.id}`}
            onClick={() => setTab(candidate.id)}
            className={`h-10 rounded-[6px] px-2 text-xs sm:text-sm font-semibold transition-colors ${
              tab === candidate.id
                ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-sm'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            <span className="block">{candidate.label}</span>
            <span className="hidden sm:block text-[10px] font-normal text-[color:var(--color-muted)]">
              {candidate.hint}
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`report-panel-${tab}`}
        aria-labelledby={`report-tab-${tab}`}
      >
        {tab === 'today' && <DailyOverviewPanel />}
        {tab === 'monthly' && (
          <MonthlyReportPanel month={month} onMonthChange={setMonth} />
        )}
        {tab === 'profit' && (
          <ProfitReportPanel
            month={month}
            onMonthChange={setMonth}
            thisMonth={thisMonth}
          />
        )}
      </div>
    </div>
  );
}

function MonthPicker({
  month,
  thisMonth,
  onMonthChange,
}: {
  month: string;
  thisMonth: string;
  onMonthChange: (month: string) => void;
}) {
  function goToMonth(nextMonth: string) {
    if (!MONTH_PATTERN.test(nextMonth) || nextMonth === month) return;
    onMonthChange(nextMonth);
  }

  return (
    <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
      <div className="flex w-full sm:w-auto items-center gap-2">
        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(month, -1))}
          className="h-11 w-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <label htmlFor="report-month" className="sr-only">
          Report month
        </label>
        <input
          id="report-month"
          type="month"
          value={month}
          onChange={(event) => goToMonth(event.target.value)}
          className="h-11 w-auto flex-1 sm:flex-none min-w-0 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
        />
        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(month, 1))}
          className="h-11 w-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      {month !== thisMonth && (
        <button
          type="button"
          onClick={() => goToMonth(thisMonth)}
          className="h-11 px-3 rounded-[8px] text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
        >
          This month
        </button>
      )}
    </div>
  );
}

function ReportError({
  error,
  onRetry,
}: {
  error: { message: string; status?: number };
  onRetry: () => void;
}) {
  const forbidden = error.status === 401 || error.status === 403;

  return (
    <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex items-start gap-3">
        <AlertCircleIcon
          className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5"
          size={20}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
            {forbidden ? 'Staff access required' : 'Unable to load the report'}
          </h2>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            {forbidden
              ? 'Viewing reports requires staff authorization. Sign in with a staff account.'
              : error.message}
          </p>
        </div>
        {!forbidden && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function DailyOverviewPanel() {
  const [report, setReport] = useState<DailyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDailyOverview();
        if (ignore) return;
        setReport(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  if (loading) return <OverviewSkeleton />;

  return (
    <div className="space-y-6">
      {error && <ReportError error={error} onRetry={retry} />}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              label="Sales today"
              value={formatNaira(report.salesToday.total)}
              detail={`${report.salesToday.count} ${
                report.salesToday.count === 1 ? 'sale' : 'sales'
              } recorded`}
            />
            <SummaryCard
              label="Payments received"
              value={formatNaira(report.paymentsReceived)}
              detail="Includes repayments on older sales"
            />
            <SummaryCard
              label="Customer balances"
              value={formatNaira(report.customerBalances)}
              detail="Total unpaid customer balance"
              tone={
                toKobo(report.customerBalances) > 0n ? 'warning' : 'default'
              }
            />
            <SummaryCard
              label="Low stock"
              value={String(report.lowStock.length)}
              detail="Products at 10 packs or fewer"
              tone={report.lowStock.length > 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--color-border)] flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
                    Recent sales
                  </h2>
                  <p className="text-xs text-[color:var(--color-muted)] mt-1">
                    The five most recent sales, newest first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] transition-colors shrink-0"
                >
                  <RefreshCwIcon size={14} />
                  Refresh
                </button>
              </div>

              {report.recentSales.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    No sales yet today
                  </p>
                  <p className="text-xs text-[color:var(--color-muted)] mt-1">
                    Record a sale to see it here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--color-border)]">
                  {report.recentSales.map((sale) => (
                    <li key={sale.id}>
                      <Link
                        to={`/sales/${sale.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[color:var(--color-subtle)] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                            {sale.reference}
                          </p>
                          <p className="text-xs text-[color:var(--color-muted)] mt-0.5 truncate">
                            {sale.customer?.name || 'Walk-in customer'} ·{' '}
                            {formatMovementDate(sale.soldAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[color:var(--color-ink)]">
                            {formatNaira(sale.itemsTotal)}
                          </p>
                          <p className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
                            Balance {formatNaira(sale.balance)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-3 border-t border-[color:var(--color-border)]">
                <Link
                  to="/sales"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                >
                  All sales
                  <ChevronRightIcon size={14} />
                </Link>
              </div>
            </section>

            <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
                <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
                  Low stock
                </h2>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  10 packs or fewer, based on current stock.
                </p>
              </div>

              {report.lowStock.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-[color:var(--color-muted)]">
                    Every product is above the low-stock threshold.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--color-border)]">
                  {report.lowStock.map((product) => (
                    <li key={product.productId}>
                      <Link
                        to={`/inventory/${product.productId}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[color:var(--color-subtle)] transition-colors"
                      >
                        <span className="text-sm font-semibold text-[color:var(--color-ink)] truncate">
                          {product.name}
                        </span>
                        <span
                          className={`text-sm shrink-0 ${
                            product.packsAvailable <= 0
                              ? 'font-semibold text-[color:var(--color-danger-ink)]'
                              : 'text-[color:var(--color-warning-ink)]'
                          }`}
                        >
                          {product.packsAvailable}{' '}
                          {product.packsAvailable === 1 ? 'pack' : 'packs'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-3 border-t border-[color:var(--color-border)]">
                <Link
                  to="/inventory"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                >
                  View inventory
                  <ChevronRightIcon size={14} />
                </Link>
              </div>
            </section>
          </div>
        </>
      )}

      {!report && !error && (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
          <p className="text-sm text-[color:var(--color-muted)]">
            The daily overview is unavailable.
          </p>
        </div>
      )}
    </div>
  );
}

function MonthlyReportPanel({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const thisMonth = useMemo(() => currentLagosMonth(), []);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchMonthlyReport(month);
        if (ignore) return;
        setReport(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [month, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--color-muted)]">
          Monthly shop report · {formatMonthLabel(month)}
        </p>
        <MonthPicker
          month={month}
          thisMonth={thisMonth}
          onMonthChange={onMonthChange}
        />
      </div>

      <p className="text-xs text-[color:var(--color-muted)]">
        Money received includes payments for earlier sales, and outstanding debt
        counts only what was still unpaid at month end.
      </p>

      {error && <ReportError error={error} onRetry={retry} />}

      {loading ? (
        <OverviewSkeleton />
      ) : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              label="Sales this month"
              value={formatNaira(report.salesTotal)}
              detail={`Sales recorded in ${formatMonthLabel(report.month)}`}
            />
            <SummaryCard
              label="Money received"
              value={formatNaira(report.moneyReceived)}
              detail="Payments recorded this month"
            />
            <SummaryCard
              label="Outstanding debt"
              value={formatNaira(report.outstandingDebtAtMonthEnd)}
              detail="Unpaid customer balance at month end"
              tone={
                toKobo(report.outstandingDebtAtMonthEnd) > 0n
                  ? 'warning'
                  : 'default'
              }
            />
            <SummaryCard
              label="Products with sales"
              value={String(report.productsSold.length)}
              detail={
                report.productsSold.length === 1
                  ? '1 product line sold'
                  : `${report.productsSold.length} product lines sold`
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
                <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
                  Product sales
                </h2>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  Bags and packs sold during {formatMonthLabel(report.month)}.
                </p>
              </div>

              {report.productsSold.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    No sales in {formatMonthLabel(report.month)}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted)] mt-1">
                    Record a sale to see product quantities here.
                  </p>
                  <Link
                    to="/sales/new"
                    className="mt-4 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
                  >
                    <PlusIcon size={14} />
                    Record sale
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                            Product
                          </th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">
                            Bags
                          </th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">
                            Packs
                          </th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">
                            Total packs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--color-border)]">
                        {report.productsSold.map((product) => (
                          <tr key={product.productId}>
                            <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]">
                              {product.productName}
                            </td>
                            <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] text-right">
                              {product.bagsSold.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] text-right">
                              {product.retailPacksSold.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right">
                              {product.totalPacksSold.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-[color:var(--color-border)]">
                    {report.productsSold.map((product) => (
                      <div key={product.productId} className="p-4">
                        <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                          {product.productName}
                        </p>
                        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--color-muted)] mt-2">
                          <span>
                            {product.bagsSold.toLocaleString()} bags ·{' '}
                            {product.retailPacksSold.toLocaleString()} packs
                          </span>
                          <span className="font-semibold text-[color:var(--color-ink)]">
                            {product.totalPacksSold.toLocaleString()} packs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
                <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
                  Closing stock
                </h2>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  Pack balance at the end of {formatMonthLabel(report.month)}, not
                  current stock.
                </p>
              </div>

              {report.closingStock.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-[color:var(--color-muted)]">
                    No products existed at the end of this month.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--color-border)]">
                  {report.closingStock.map((product) => (
                    <li
                      key={product.productId}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <p className="text-sm font-semibold text-[color:var(--color-ink)] truncate">
                        {product.productName}
                      </p>
                      <p className="text-sm text-[color:var(--color-muted)] shrink-0">
                        {product.closingPacks.toLocaleString()} packs
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-3 border-t border-[color:var(--color-border)]">
                <Link
                  to="/inventory"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                >
                  View inventory
                  <ChevronRightIcon size={14} />
                </Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        !error && (
          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
            <p className="text-sm text-[color:var(--color-muted)]">
              The report is unavailable. Retry to load {formatMonthLabel(month)}.
            </p>
          </div>
        )
      )}
    </div>
  );
}

function ProfitReportPanel({
  month,
  onMonthChange,
  thisMonth,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  thisMonth: string;
}) {
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      setReport(null);
      try {
        const result = await fetchProfitReport(month);
        if (ignore) return;
        setReport(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [month, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);
  const missingCost = error?.status === 409;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--color-muted)]">
          Profit report · {formatMonthLabel(month)}
        </p>
        <MonthPicker
          month={month}
          thisMonth={thisMonth}
          onMonthChange={onMonthChange}
        />
      </div>

      <p className="text-xs text-[color:var(--color-muted)]">
        Revenue is what customers were charged. Cost of goods uses the recorded
        cost per pack at the time of each sale, and expenses are the shop
        expenses dated in this month.
      </p>

      {error && missingCost && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-warning-bg)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon
              size={20}
              className="shrink-0 mt-0.5 text-[color:var(--color-warning-ink)]"
            />
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--color-warning-ink)]">
                Profit cannot be calculated
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.message} Profit figures are withheld until the affected
                products' known acquisition costs have been recorded. Use product
                setup for opening stock or record the cost when receiving stock,
                then run the report again.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && !missingCost && <ReportError error={error} onRetry={retry} />}

      {loading ? (
        <OverviewSkeleton />
      ) : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              label="Revenue"
              value={formatNaira(report.revenue)}
              detail="Total value of sales this month"
            />
            <SummaryCard
              label="Cost of goods"
              value={formatNaira(report.cogs)}
              detail="Recorded cost of the packs sold"
            />
            <SummaryCard
              label="Gross profit"
              value={formatNaira(report.grossProfit)}
              detail="Revenue minus cost of goods"
              tone={toKobo(report.grossProfit) < 0n ? 'warning' : 'default'}
            />
            <SummaryCard
              label="Net profit"
              value={formatNaira(report.netProfit)}
              detail="Gross profit minus expenses"
              tone={toKobo(report.netProfit) < 0n ? 'warning' : 'default'}
            />
          </div>

          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
              <h2 className="text-sm font-bold text-[color:var(--color-ink)]">
                How net profit is calculated
              </h2>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                {formatMonthLabel(month)} · Africa/Lagos calendar month.
              </p>
            </div>
            <dl className="divide-y divide-[color:var(--color-border)]">
              <ProfitRow label="Revenue" value={report.revenue} />
              <ProfitRow label="Less cost of goods sold" value={report.cogs} negative />
              <ProfitRow label="Gross profit" value={report.grossProfit} strong />
              <ProfitRow label="Less expenses" value={report.expenses} negative />
              <ProfitRow label="Net profit" value={report.netProfit} strong />
            </dl>
            <div className="px-5 py-3 border-t border-[color:var(--color-border)]">
              <Link
                to="/expenses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
              >
                View recorded expenses
                <ChevronRightIcon size={14} />
              </Link>
            </div>
          </section>
        </>
      ) : (
        !error && (
          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
            <p className="text-sm text-[color:var(--color-muted)]">
              The profit report is unavailable. Retry to load{' '}
              {formatMonthLabel(month)}.
            </p>
          </div>
        )
      )}
    </div>
  );
}

function ProfitRow({
  label,
  value,
  negative = false,
  strong = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  strong?: boolean;
}) {
  const amount = Number(value);
  const isNegative = negative || amount < 0;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt
        className={`text-sm ${
          strong
            ? 'font-semibold text-[color:var(--color-ink)]'
            : 'text-[color:var(--color-muted)]'
        }`}
      >
        {label}
      </dt>
      <dd
        className={`text-sm text-right ${
          strong ? 'font-bold' : 'font-semibold'
        } ${
          isNegative && amount !== 0
            ? 'text-[color:var(--color-danger-ink)]'
            : 'text-[color:var(--color-ink)]'
        }`}
      >
        {negative ? '− ' : ''}
        {formatNaira(Math.abs(amount))}
      </dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
      <p className="text-xs font-semibold text-[color:var(--color-muted)]">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tracking-tight mt-2 ${
          tone === 'warning'
            ? 'text-[color:var(--color-danger-ink)]'
            : 'text-[color:var(--color-ink)]'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-[color:var(--color-muted)] mt-1">{detail}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-80 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        <div className="h-80 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
      </div>
    </div>
  );
}
