import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { StockTakeDetail, StockTakeItem } from '../../types/stocktake';
import {
  cancelStockTake,
  fetchStockTake,
  finalizeStockTake,
} from '../../lib/api/stockTakes';
import {
  countedByLabel,
  describeStockTakeError,
  differenceFromExpected,
  formatPackDifference,
  isDraftStockTake,
  pluralPacks,
  stockTakeProgress,
} from '../../lib/stocktakes';
import { formatLongDate, formatShortDate } from '../../lib/utils/format';
import { useAuth } from '../../app/auth/auth-context';
import { StockTakeStatusBadge } from '../../components/stocktakes/StockTakeStatusBadge';
import { CountStockModal } from '../../components/stocktakes/CountStockModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BackNavigation } from '../../components/ui/BackNavigation';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  HistoryIcon,
  RefreshCwIcon,
  XIcon,
} from '../../components/ui/Icons';

type PendingAction = 'finalize' | 'cancel';

export function StockTakeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isOwner, user } = useAuth();

  const [stockTake, setStockTake] = useState<StockTakeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [countingItem, setCountingItem] = useState<StockTakeItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    // The route always supplies an id; the guard keeps the fetch honest.
    if (!id) return;

    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchStockTake(id);
        if (ignore) return;
        setStockTake(result);
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
  }, [id, reloadKey]);

  const handleCountSaved = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  async function handleConfirmedAction() {
    if (!pendingAction || !stockTake) return;

    setActionBusy(true);
    setActionError(null);

    try {
      if (pendingAction === 'finalize') {
        await finalizeStockTake(stockTake.id);
      } else {
        await cancelStockTake(stockTake.id);
      }
      setPendingAction(null);
      setReloadKey((key) => key + 1);
    } catch (err: unknown) {
      setActionError(describeStockTakeError(err, pendingAction));
      setPendingAction(null);
    } finally {
      setActionBusy(false);
    }
  }

  const progress = useMemo(
    () =>
      stockTake
        ? stockTakeProgress(stockTake.countedProducts, stockTake.totalProducts)
        : 0,
    [stockTake],
  );

  if (!id) {
    return (
      <StockTakeLoadError
        message="This stocktake could not be found. It may have been removed."
        onBack={() => navigate('/stocktakes')}
      />
    );
  }

  if (loading) {
    return (
      <div
        aria-busy="true"
        className="max-w-6xl space-y-4 pb-12"
      >
        <div className="h-8 w-64 animate-pulse rounded-[4px] bg-[color:var(--color-subtle)]" />
        <div className="h-32 animate-pulse rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        <div className="h-96 animate-pulse rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
      </div>
    );
  }

  if (error || !stockTake) {
    return (
      <StockTakeLoadError
        message={error ?? 'This stocktake could not be found.'}
        onBack={() => navigate('/stocktakes')}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  const draft = isDraftStockTake(stockTake.status);
  const allCounted =
    stockTake.totalProducts > 0 &&
    stockTake.countedProducts >= stockTake.totalProducts;

  return (
    <div className="max-w-6xl space-y-6 pb-12">
      <div className="space-y-4">
        <Link
          to="/stocktakes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-ink)]"
        >
          <BackNavigation fallback="/stocktakes" label="Back to stocktakes" />
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:text-[32px]">
                {draft ? 'Count stock' : stockTake.name}
              </h1>
              <StockTakeStatusBadge status={stockTake.status} />
            </div>
            <p className="text-sm text-[color:var(--color-muted)]">
              <span className="font-mono text-xs">{stockTake.reference}</span>
              {' · '}
              {draft ? stockTake.name : `Started ${formatShortDate(stockTake.createdAt)}`}
            </p>
          </div>

          {draft && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setPendingAction('cancel');
                  }}
                  disabled={actionBusy}
                  className="h-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-xs"
                >
                  Cancel stocktake
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setPendingAction('finalize');
                  }}
                  disabled={actionBusy || !allCounted}
                  title={
                    allCounted
                      ? undefined
                      : 'Every product must be counted before approval.'
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-sm font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-xs"
                >
                  <ClipboardCheckIcon size={16} />
                  Approve stocktake
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-4 text-sm font-medium text-[color:var(--color-danger-ink)]"
        >
          <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {stockTake.status === 'Finalized' && (
        <div className="space-y-2 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-success-ink)]">
            <CheckCircleIcon size={18} />
            Stocktake approved
          </div>
          <p className="text-xs text-[color:var(--color-success-ink)]">
            Stock balances were updated
            {stockTake.finalizedAt
              ? ` on ${formatLongDate(stockTake.finalizedAt)}`
              : ''}
            . Each difference is recorded as an adjustment in the movement
            ledger.
          </p>
          <Link
            to="/movements"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-success-ink)] underline underline-offset-2"
          >
            <HistoryIcon size={14} />
            View movements
          </Link>
        </div>
      )}

      {stockTake.status === 'Cancelled' && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-5">
          <XIcon size={18} className="mt-0.5 shrink-0 text-[color:var(--color-muted)]" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
              Stocktake cancelled
            </p>
            <p className="text-xs text-[color:var(--color-muted)]">
              No stock balances were changed. Start a new stocktake when you are
              ready to count again.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            {stockTake.countedProducts} of {stockTake.totalProducts}{' '}
            {stockTake.totalProducts === 1 ? 'product' : 'products'} counted
          </p>
          <p className="text-xs text-[color:var(--color-muted)]">{progress}%</p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Products counted"
          className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-subtle)]"
        >
          <div
            className="h-full rounded-full bg-[color:var(--color-accent)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[color:var(--color-muted)]">
          {draft
            ? 'Stock changes only after an owner approves the differences.'
            : 'This stocktake is closed and can no longer be counted.'}
        </p>
      </div>

      {stockTake.items.length === 0 ? (
        <div className="space-y-2 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-12 text-center">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No products in this stocktake
          </p>
          <p className="mx-auto max-w-sm text-xs text-[color:var(--color-muted)]">
            The stocktake was created when no active products existed. Add a
            product, then start a new stocktake.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[12px] font-medium text-[color:var(--color-muted)]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Counted</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                  <th className="px-4 py-3">Counted by</th>
                  <th className="px-4 py-3 text-right">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] text-sm">
                {stockTake.items.map((item) => {
                  const difference = differenceFromExpected(item);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[color:var(--color-ink)]">
                          {item.productName}
                        </div>
                        <div className="text-xs text-[color:var(--color-muted)]">
                          {item.packName}
                          {item.size ? ` · ${item.size}` : ''} ·{' '}
                          {item.packsPerBag} packs per bag
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[color:var(--color-ink)]">
                        {item.expectedPacks.toLocaleString()}{' '}
                        <span className="text-xs text-[color:var(--color-muted)]">
                          {pluralPacks(item.expectedPacks)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[color:var(--color-ink)]">
                        {item.countedPacks === null ? (
                          <span className="text-xs text-[color:var(--color-muted)]">
                            Not counted
                          </span>
                        ) : (
                          <>
                            {item.countedPacks.toLocaleString()}{' '}
                            <span className="text-xs text-[color:var(--color-muted)]">
                              {pluralPacks(item.countedPacks)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold">
                        {difference === null ? (
                          <span className="text-[color:var(--color-muted)]">—</span>
                        ) : (
                          <span className={differenceToneClass(difference)}>
                            {formatPackDifference(difference)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[color:var(--color-muted)]">
                        {item.countedAt ? (
                          <>
                            {countedByLabel(item.countedBy, user?.id)}
                            <span className="block">
                              {formatShortDate(item.countedAt)}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {draft ? (
                          <button
                            type="button"
                            onClick={() => setCountingItem(item)}
                            className="text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline"
                          >
                            {item.countedPacks === null ? 'Count' : 'Recount'}
                          </button>
                        ) : (
                          <span className="text-xs text-[color:var(--color-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {stockTake.items.map((item) => {
              const difference = differenceFromExpected(item);
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--color-ink)]">
                        {item.productName}
                      </div>
                      <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                        {item.packName}
                        {item.size ? ` · ${item.size}` : ''} · {item.packsPerBag}{' '}
                        packs per bag
                      </div>
                    </div>
                    {difference !== null && (
                      <span
                        className={`shrink-0 text-xs font-semibold ${differenceToneClass(difference)}`}
                      >
                        {formatPackDifference(difference)}
                      </span>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-[color:var(--color-muted)]">Expected</dt>
                      <dd className="font-semibold text-[color:var(--color-ink)]">
                        {item.expectedPacks.toLocaleString()} packs
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--color-muted)]">Counted</dt>
                      <dd className="font-semibold text-[color:var(--color-ink)]">
                        {item.countedPacks === null
                          ? 'Not counted'
                          : `${item.countedPacks.toLocaleString()} packs`}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[color:var(--color-muted)]">
                      {item.countedAt
                        ? `${countedByLabel(item.countedBy, user?.id)} · ${formatShortDate(item.countedAt)}`
                        : 'Not counted yet'}
                    </span>
                    {draft && (
                      <button
                        type="button"
                        onClick={() => setCountingItem(item)}
                        className="h-9 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-xs font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)]"
                      >
                        {item.countedPacks === null ? 'Count' : 'Recount'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="pt-2 text-xs text-[color:var(--color-muted)]">
        {isOwner
          ? 'Approving applies each difference to stock and writes it to the movement ledger.'
          : 'An owner approves the count. Saved counts never change stock on their own.'}
      </p>

      {countingItem && (
        <CountStockModal
          stockTakeId={stockTake.id}
          item={countingItem}
          onClose={() => setCountingItem(null)}
          onSaved={handleCountSaved}
        />
      )}

      {pendingAction === 'finalize' && (
        <ConfirmDialog
          title="Approve stocktake"
          description={
            <>
              Stock balances are updated by each difference and recorded as stock
              adjustments. Sales or receipts made after a count are kept.
            </>
          }
          confirmLabel="Approve stocktake"
          busyLabel="Approving…"
          busy={actionBusy}
          tone="default"
          onConfirm={() => void handleConfirmedAction()}
          onCancel={() => setPendingAction(null)}
        >
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-[color:var(--color-muted)]">Products</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {stockTake.totalProducts}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-muted)]">Differences</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {stockTake.items.filter(
                  (item) => (differenceFromExpected(item) ?? 0) !== 0,
                ).length}
              </dd>
            </div>
          </dl>
        </ConfirmDialog>
      )}

      {pendingAction === 'cancel' && (
        <ConfirmDialog
          title="Cancel stocktake"
          description={
            <>
              The recorded counts are kept for reference, but stock balances stay
              unchanged. This cannot be undone.
            </>
          }
          confirmLabel="Cancel stocktake"
          busyLabel="Cancelling…"
          busy={actionBusy}
          onConfirm={() => void handleConfirmedAction()}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

function differenceToneClass(difference: number): string {
  if (difference < 0) return 'text-[color:var(--color-danger-ink)]';
  if (difference > 0) return 'text-[color:var(--color-warning-ink)]';
  return 'text-[color:var(--color-muted)]';
}

function StockTakeLoadError({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-center">
      <AlertCircleIcon
        className="mx-auto text-[color:var(--color-danger-ink)]"
        size={32}
      />
      <h1 className="text-base font-semibold text-[color:var(--color-ink)]">
        Unable to load this stocktake
      </h1>
      <p className="text-xs text-[color:var(--color-muted)]">{message}</p>
      <div className="flex flex-col-reverse justify-center gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-xs font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)]"
        >
          Back to stocktakes
        </button>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
