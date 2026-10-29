import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMonthlyReport } from '../../lib/api/reports';
import { ApiError } from '../../lib/api/client';
import {
  currentLagosMonth,
  formatMonthLabel,
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
import type { MonthlyReport } from '../../types/report';

const MONTH_PATTERN = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

export function OverviewPage() {
  const thisMonth = useMemo(() => currentLagosMonth(), []);
  const [month, setMonth] = useState(thisMonth);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
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

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  function goToMonth(nextMonth: string) {
    if (!MONTH_PATTERN.test(nextMonth) || nextMonth === month) return;
    setLoading(true);
    setError(null);
    setMonth(nextMonth);
  }

  const productLines = report?.productsSold.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Overview
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Monthly shop report · {formatMonthLabel(month)} · Africa/Lagos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
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
              onChange={(e) => goToMonth(e.target.value)}
              className="h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
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

          <Link
            to="/sales/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            <PlusIcon size={16} />
            Record sale
          </Link>
        </div>
      </div>

      <p className="text-xs text-[color:var(--color-muted)]">
        Figures are calculated by the backend for the Africa/Lagos calendar month.
        Money received includes payments for earlier sales, and outstanding debt counts
        only what was still unpaid at month end.
      </p>

      {error && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                {error.status === 401 || error.status === 403
                  ? 'Staff access required'
                  : 'Unable to load the report'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Viewing reports requires staff authorization. Sign in with a staff account.'
                  : error.message}
              </p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              <RefreshCwIcon size={14} />
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <OverviewSkeleton />
      ) : error || !report ? (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
          <p className="text-sm text-[color:var(--color-muted)]">
            The report is unavailable. Retry to load {formatMonthLabel(month)}.
          </p>
        </div>
      ) : (
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
              tone={toKobo(report.outstandingDebtAtMonthEnd) > 0n ? 'warning' : 'default'}
            />
            <SummaryCard
              label="Products with sales"
              value={String(productLines)}
              detail={productLines === 1 ? '1 product line sold' : `${productLines} product lines sold`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
                <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Product sales</h2>
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
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Product</th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Bags</th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Packs</th>
                          <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Total packs</th>
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
                <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Closing stock</h2>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  Pack balance at the end of {formatMonthLabel(report.month)}, not current stock.
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
      )}
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
      <p className="text-xs font-semibold text-[color:var(--color-muted)]">{label}</p>
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
