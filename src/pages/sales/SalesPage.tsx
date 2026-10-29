import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSales } from '../../lib/api/sales';
import { fetchCustomers } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import { formatMovementDate, formatNaira } from '../../lib/utils/format';
import {
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
} from '../../components/ui/Icons';
import type { Customer } from '../../types/customer';
import type { Sale } from '../../types/sale';

const PAGE_SIZE = 20;

export function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [salesResult, customersResult] = await Promise.allSettled([
        fetchSales(page, PAGE_SIZE),
        fetchCustomers(),
      ]);

      if (ignore) return;

      if (salesResult.status === 'fulfilled') {
        setSales(salesResult.value.data);
        setTotal(salesResult.value.total);
      } else {
        const err = salesResult.reason;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      }

      // Customer names are a convenience: a failure here must not hide sales.
      if (customersResult.status === 'fulfilled') {
        setCustomers(customersResult.value);
      }

      setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [page, reloadKey]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of customers) map.set(customer.id, customer);
    return map;
  }, [customers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setLoading(true);
    setError(null);
    setPage(nextPage);
  }

  function customerLabel(sale: Sale): string {
    if (!sale.customerId) return 'Walk-in customer';
    const customer = customerMap.get(sale.customerId);
    if (customer) return customer.name;
    return `Customer #${sale.customerId.slice(0, 8)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Sales history
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Shop sales, customers and saved item prices.
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
        <EmptySalesState />
      ) : sales.length === 0 ? (
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
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Total</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[color:var(--color-subtle)]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <Link
                        to={`/sales/${sale.id}`}
                        title={sale.id}
                        className="font-semibold text-sm text-[color:var(--color-ink)] group-hover:text-[color:var(--color-accent)] transition-colors"
                      >
                        #{sale.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {customerLabel(sale)}
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {formatMovementDate(sale.soldAt)}
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-[color:var(--color-ink)]">
                      {formatNaira(sale.itemsTotal)}
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
            {sales.map((sale) => (
              <Link
                key={sale.id}
                to={`/sales/${sale.id}`}
                className="block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 hover:border-[color:var(--color-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      Sale #{sale.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-1 truncate">
                      {customerLabel(sale)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[color:var(--color-ink)] shrink-0">
                    {formatNaira(sale.itemsTotal)}
                  </p>
                </div>
                <div className="text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3 flex items-center justify-between">
                  <span>{formatMovementDate(sale.soldAt)}</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[color:var(--color-accent-ink)]">
                    Details
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
