import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StockTake } from '../../types/stocktake';
import { fetchStockTakes } from '../../lib/api/stockTakes';
import {
  describeStockTakeError,
  STOCK_TAKE_PAGE_SIZE,
} from '../../lib/stocktakes';
import { formatShortDate } from '../../lib/utils/format';
import { StockTakeStatusBadge } from '../../components/stocktakes/StockTakeStatusBadge';
import { StartStocktakeModal } from '../../components/stocktakes/StartStocktakeModal';
import {
  AlertCircleIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  PlusIcon,
  RefreshCwIcon,
} from '../../components/ui/Icons';

export function StockTakesPage() {
  const navigate = useNavigate();
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchStockTakes(page, STOCK_TAKE_PAGE_SIZE);
        if (ignore) return;
        setStockTakes(result.data);
        setTotal(result.total);
      } catch (err: unknown) {
        if (ignore) return;
        setError(describeStockTakeError(err, 'load'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [page, reloadKey]);

  const handleRetry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / STOCK_TAKE_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * STOCK_TAKE_PAGE_SIZE + 1;
  const showingTo = Math.min(page * STOCK_TAKE_PAGE_SIZE, total);

  return (
    <div className="max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:text-[32px]">
            Stocktakes
          </h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            Count the physical stock and review any differences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStartOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-sm font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)] sm:h-10 sm:text-xs"
        >
          <PlusIcon size={16} />
          <span>Start stocktake</span>
        </button>
      </div>

      {loading && (
        <div
          aria-busy="true"
          className="animate-pulse space-y-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6"
        >
          <div className="h-6 w-48 rounded-[4px] bg-[color:var(--color-subtle)]" />
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-[8px] bg-[color:var(--color-subtle)]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mx-auto max-w-md space-y-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-center">
          <AlertCircleIcon
            className="mx-auto text-[color:var(--color-danger-ink)]"
            size={32}
          />
          <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
            Unable to load stocktakes
          </h2>
          <p className="text-xs text-[color:var(--color-muted)]">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && stockTakes.length === 0 && (
        <div className="space-y-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-12 text-center">
          <ClipboardListIcon
            className="mx-auto text-[color:var(--color-muted)]"
            size={32}
          />
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No stocktakes yet
          </p>
          <p className="mx-auto max-w-sm text-xs text-[color:var(--color-muted)]">
            Start a stocktake to record what is physically on the shelf. Every
            active product is included with its current stock.
          </p>
          <button
            type="button"
            onClick={() => setStartOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
          >
            <PlusIcon size={14} />
            Start stocktake
          </button>
        </div>
      )}

      {!loading && !error && stockTakes.length > 0 && (
        <div className="space-y-4">
          <div className="hidden overflow-x-auto rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[12px] font-medium text-[color:var(--color-muted)]">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] text-sm">
                {stockTakes.map((stockTake) => (
                  <tr
                    key={stockTake.id}
                    className="transition-colors hover:bg-[color:var(--color-subtle)]/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-[color:var(--color-ink)]">
                      {stockTake.reference}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/stocktakes/${stockTake.id}`}
                        className="font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-accent)] hover:underline"
                      >
                        {stockTake.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[color:var(--color-muted)]">
                      {formatShortDate(stockTake.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StockTakeStatusBadge status={stockTake.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/stocktakes/${stockTake.id}`}
                        aria-label={`Open ${stockTake.reference}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline"
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

          <div className="space-y-3 md:hidden">
            {stockTakes.map((stockTake) => (
              <Link
                key={stockTake.id}
                to={`/stocktakes/${stockTake.id}`}
                className="block space-y-2 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 transition-colors hover:bg-[color:var(--color-subtle)]/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
                      {stockTake.name}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-[color:var(--color-muted)]">
                      {stockTake.reference}
                    </div>
                  </div>
                  <StockTakeStatusBadge status={stockTake.status} />
                </div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  Started {formatShortDate(stockTake.createdAt)}
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
            <p className="text-xs text-[color:var(--color-muted)]">
              Showing {showingFrom}–{showingTo} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="h-10 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-xs font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-[color:var(--color-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
                className="h-10 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-xs font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="pt-2 text-xs text-[color:var(--color-muted)]">
        Only an approved stocktake changes stock balances.
      </p>

      {startOpen && (
        <StartStocktakeModal
          onClose={() => setStartOpen(false)}
          onCreated={(id) => navigate(`/stocktakes/${id}`)}
        />
      )}
    </div>
  );
}
