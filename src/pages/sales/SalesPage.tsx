import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchSales, fetchSalesSummary } from '../../lib/api/sales';
import { ApiError } from '../../lib/api/client';
import { formatMovementDate, formatNaira } from '../../lib/utils/format';
import { SheetSelect } from '../../components/ui/SheetSelect';
import {
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShoppingBagIcon,
  XIcon,
} from '../../components/ui/Icons';
import {
  normalisePaymentStatus,
  type PaymentStatus,
  type SalesFilters,
  type SalesListPaymentStatus,
  type SalesListRow,
  type SalesSummary,
} from '../../types/sale';

const PAGE_SIZE = 20;

interface AppliedFilters {
  q: string;
  from: string;
  to: string;
  paymentStatus: SalesListPaymentStatus | '';
}

const EMPTY_FILTERS: AppliedFilters = {
  q: '',
  from: '',
  to: '',
  paymentStatus: '',
};

export function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = searchParams.get('customerId') ?? '';

  const [rows, setRows] = useState<SalesListRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const buildFilters = useCallback(
    (targetPage: number): SalesFilters => {
      const query: SalesFilters = { page: targetPage, limit: PAGE_SIZE };
      if (filters.q.trim()) query.q = filters.q.trim();
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
      if (customerId) query.customerId = customerId;
      return query;
    },
    [customerId, filters],
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      const salesRequest = fetchSales(buildFilters(page));
      // The summary mirrors the date range but not the text/status filters,
      // because the backend summary endpoint only accepts from/to.
      const summaryRequest = fetchSalesSummary(
        filters.from || undefined,
        filters.to || undefined,
      );

      const [salesResult, summaryResult] = await Promise.allSettled([
        salesRequest,
        summaryRequest,
      ]);

      if (ignore) return;

      if (salesResult.status === 'fulfilled') {
        setRows(salesResult.value.data);
        setTotal(salesResult.value.total);
        setTotalPages(Math.max(1, salesResult.value.totalPages || 1));
      } else {
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        const err = salesResult.reason;
        setError(
          err instanceof ApiError
            ? { message: err.message, status: err.status }
            : {
                message:
                  'Unable to connect. Check your connection and try again.',
              },
        );
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
        setSummaryError(null);
      } else {
        setSummary(null);
        setSummaryError(
          summaryResult.reason instanceof ApiError
            ? summaryResult.reason.message
            : 'Sales totals are unavailable.',
        );
      }

      setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [buildFilters, page, reloadKey, filters.from, filters.to]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.q ||
          filters.from ||
          filters.to ||
          filters.paymentStatus ||
          customerId,
      ),
    [filters, customerId],
  );

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draft);
    setPage(1);
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    if (customerId) {
      const next = new URLSearchParams(searchParams);
      next.delete('customerId');
      setSearchParams(next, { replace: true });
    }
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Sales history
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Shop sales, payments and balances.
          </p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0"
        >
          <PlusIcon size={16} />
          Record sale
        </Link>
      </div>

      {customerId && (
        <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] px-4 py-2">
          <span className="text-xs font-medium text-[color:var(--color-muted)]">
            Showing sales for one customer.
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
          >
            Show all sales
          </button>
        </div>
      )}

      <SummaryCards summary={summary} error={summaryError} loading={loading && !summary} />

      <form
        onSubmit={applyFilters}
        className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="block text-xs font-semibold text-[color:var(--color-muted)] mb-1">
              Search
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[color:var(--color-muted)]">
                <SearchIcon size={16} />
              </span>
              <input
                type="search"
                value={draft.q}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, q: event.target.value }))
                }
                placeholder="Sale number or customer"
                maxLength={100}
                className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
              />
            </div>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-[color:var(--color-muted)] mb-1">
              From
            </span>
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(event) =>
                setDraft((current) => ({ ...current, from: event.target.value }))
              }
              className="w-full h-10 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-[color:var(--color-muted)] mb-1">
              To
            </span>
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(event) =>
                setDraft((current) => ({ ...current, to: event.target.value }))
              }
              className="w-full h-10 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
            />
          </label>
          <div className="block">
            <span className="block text-xs font-semibold text-[color:var(--color-muted)] mb-1">
              Payment status
            </span>
            <SheetSelect
              label="Payment status"
              value={draft.paymentStatus}
              options={[
                { value: '', label: 'All' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIAL', label: 'Partly paid' },
                { value: 'UNPAID', label: 'Unpaid' },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  paymentStatus: value as SalesListPaymentStatus | '',
                }))
              }
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            Apply filters
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-[8px] text-xs font-semibold border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              <XIcon size={14} />
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                {error.status === 401 || error.status === 403
                  ? 'Staff access required'
                  : 'Unable to load sales'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Viewing sales requires staff authorization. Sign in with a staff account.'
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
        <SalesSkeleton />
      ) : total === 0 && !error ? (
        hasActiveFilters ? (
          <NoMatchingSales onClear={clearFilters} />
        ) : (
          <EmptySalesState />
        )
      ) : rows.length === 0 ? (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No sales on this page
          </p>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            The list may have changed. Return to the first page to reload.
          </p>
          <button
            type="button"
            onClick={() => changePage(1)}
            className="mt-4 h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            First page
          </button>
        </div>
      ) : (
        <>
          <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Sale</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Customer</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Date</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Total</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Paid</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Balance</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Status</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {rows.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[color:var(--color-subtle)]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <Link
                        to={`/sales/${sale.id}`}
                        title={sale.id}
                        className="font-semibold text-sm text-[color:var(--color-ink)] group-hover:text-[color:var(--color-accent)] transition-colors"
                      >
                        {sale.reference}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {sale.customer?.name || 'Walk-in customer'}
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {formatMovementDate(sale.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right">
                      {formatNaira(sale.itemsTotal)}
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)] text-right">
                      {formatNaira(sale.amountPaid)}
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)] text-right">
                      {formatNaira(sale.balance)}
                    </td>
                    <td className="py-4 px-4">
                      <PaymentStatusBadge status={normalisePaymentStatus(sale.status)} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/sales/${sale.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                      >
                        View
                        <ChevronRightIcon size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {rows.map((sale) => (
              <Link
                key={sale.id}
                to={`/sales/${sale.id}`}
                className="block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 hover:border-[color:var(--color-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {sale.reference}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-1 truncate">
                      {sale.customer?.name || 'Walk-in customer'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[color:var(--color-ink)]">
                      {formatNaira(sale.itemsTotal)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <PaymentStatusBadge status={normalisePaymentStatus(sale.status)} />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3 flex items-center justify-between gap-3">
                  <span>{formatMovementDate(sale.createdAt)}</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[color:var(--color-accent-ink)]">
                    Balance {formatNaira(sale.balance)}
                    <ChevronRightIcon size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-medium text-[color:var(--color-muted)]">
              Showing {rangeStart}–{rangeEnd} of {total} {total === 1 ? 'sale' : 'sales'} · open a sale
              for items, payments and balance
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1}
                  className="h-9 px-3 rounded-[8px] text-xs font-semibold border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-[color:var(--color-muted)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={page >= totalPages}
                  className="h-9 px-3 rounded-[8px] text-xs font-semibold border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const classes =
    status === 'PAID'
      ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
      : status === 'PART_PAID'
        ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
        : 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]';
  const label = status === 'PAID' ? 'Paid' : status === 'PART_PAID' ? 'Partly paid' : 'Unpaid';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function SummaryCards({
  summary,
  error,
  loading,
}: {
  summary: SalesSummary | null;
  error: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-[84px] rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
        <p className="text-xs text-[color:var(--color-muted)]">
          Totals unavailable{error ? `: ${error}` : '.'}
        </p>
      </div>
    );
  }

  const cards = [
    { label: 'Sales total', value: formatNaira(summary.salesTotal) },
    { label: 'Sales count', value: String(summary.salesCount) },
    { label: 'Amount paid', value: formatNaira(summary.amountPaid) },
    { label: 'Outstanding', value: formatNaira(summary.outstanding), tone: 'danger' as const },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
        >
          <p className="text-xs font-semibold text-[color:var(--color-muted)]">{card.label}</p>
          <p
            className={`mt-1 text-xl font-bold tracking-tight ${
              card.tone === 'danger'
                ? 'text-[color:var(--color-danger-ink)]'
                : 'text-[color:var(--color-ink)]'
            }`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function NoMatchingSales({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
      <h2 className="text-lg font-bold text-[color:var(--color-ink)]">No matching sales</h2>
      <p className="text-sm text-[color:var(--color-muted)] mt-1">
        Try a different search term, date range or payment status.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

function EmptySalesState() {
  return (
    <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 md:p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] flex items-center justify-center mb-4">
        <ShoppingBagIcon size={32} />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-[color:var(--color-ink)]">
        No sales recorded yet
      </h2>
      <p className="text-sm md:text-base text-[color:var(--color-muted)] max-w-md mx-auto mt-2 mb-6">
        Record the first sale to see its items, prices and customer here.
      </p>
      <Link
        to="/sales/new"
        className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
      >
        <PlusIcon size={16} />
        Record sale
      </Link>
    </div>
  );
}

function SalesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
        <div className="h-10 bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]" />
        <div className="divide-y divide-[color:var(--color-border)]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="h-5 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-40 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-28 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-20 bg-[color:var(--color-subtle)] rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
      <div className="lg:hidden space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 space-y-3 animate-pulse"
          >
            <div className="h-5 w-32 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-40 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-full bg-[color:var(--color-subtle)] rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
