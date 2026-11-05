import { useId, useMemo, useState } from 'react';
import type { StockTakeItem } from '../../types/stocktake';
import { recordStockTakeCount } from '../../lib/api/stockTakes';
import {
  countedPacksFromBags,
  describeStockTakeError,
  formatPackDifference,
  pluralPacks,
  splitCountedPacks,
  validateCountInput,
} from '../../lib/stocktakes';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

interface CountStockModalProps {
  stockTakeId: string;
  item: StockTakeItem;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Records one product's physical count as whole bags plus loose packs and
 * sends the combined pack total the backend expects.
 *
 * The design's count screen separates cartons and loose packs; this project
 * calls the bulk unit a bag (DEC-022). The backend stores one pack total, so
 * the split is a local input convenience, not a separate persisted field.
 */
export function CountStockModal({
  stockTakeId,
  item,
  onClose,
  onSaved,
}: CountStockModalProps) {
  const titleId = useId();
  const bagsId = useId();
  const looseId = useId();

  const initial = splitCountedPacks(item.countedPacks ?? 0, item.packsPerBag);
  const [bags, setBags] = useState(String(initial.bags));
  const [loosePacks, setLoosePacks] = useState(String(initial.loosePacks));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(
    () =>
      validateCountInput({
        bags,
        loosePacks,
        packsPerBag: item.packsPerBag,
      }),
    [bags, loosePacks, item.packsPerBag],
  );

  const previewBags = Number(bags);
  const previewLoose = Number(loosePacks);
  const canPreviewNumbers =
    Number.isInteger(previewBags) &&
    Number.isInteger(previewLoose) &&
    previewBags >= 0 &&
    previewLoose >= 0 &&
    item.packsPerBag > 0;

  const previewTotal = canPreviewNumbers
    ? countedPacksFromBags(previewBags, previewLoose, item.packsPerBag)
    : null;
  const previewDifference =
    previewTotal === null ? null : previewTotal - item.expectedPacks;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await recordStockTakeCount(stockTakeId, item.id, validation.countedPacks);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(describeStockTakeError(err, 'count'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer glass-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-panel relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[16px] pb-[env(safe-area-inset-bottom)] sm:max-w-[520px] sm:rounded-[12px] sm:pb-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-[color:var(--color-ink)]">
              Count stock
            </h2>
            <p className="mt-1 truncate text-xs text-[color:var(--color-muted)]">
              {item.productName}
              {item.size ? ` · ${item.size}` : ''} · {item.packsPerBag} packs per bag
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-[8px] p-1.5 text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[8px] bg-[color:var(--color-subtle)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                Expected stock
              </div>
              <div className="mt-0.5 text-lg font-bold text-[color:var(--color-ink)]">
                {item.expectedPacks.toLocaleString()}{' '}
                <span className="text-xs font-medium text-[color:var(--color-muted)]">
                  {pluralPacks(item.expectedPacks)}
                </span>
              </div>
            </div>
            <div className="rounded-[8px] bg-[color:var(--color-subtle)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                Stock when counted
              </div>
              <div className="mt-0.5 text-lg font-bold text-[color:var(--color-ink)]">
                {item.stockAtCountPacks === null ? (
                  <span className="text-xs font-medium text-[color:var(--color-muted)]">
                    Captured on save
                  </span>
                ) : (
                  <>
                    {item.stockAtCountPacks.toLocaleString()}{' '}
                    <span className="text-xs font-medium text-[color:var(--color-muted)]">
                      {pluralPacks(item.stockAtCountPacks)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor={bagsId}
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Bags counted
              </label>
              <input
                id={bagsId}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={bags}
                onChange={(event) => {
                  setBags(event.target.value);
                  setError(null);
                }}
                className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={looseId}
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Loose packs
              </label>
              <input
                id={looseId}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={loosePacks}
                onChange={(event) => {
                  setLoosePacks(event.target.value);
                  setError(null);
                }}
                className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[color:var(--color-subtle)] px-4 py-3 text-sm">
            <span className="text-[color:var(--color-muted)]">Counted stock</span>
            <span className="text-right">
              <span className="font-bold text-[color:var(--color-ink)]">
                {previewTotal === null ? '—' : `${previewTotal.toLocaleString()} packs`}
              </span>
              {previewDifference !== null && (
                <span
                  className={`ml-2 text-xs font-semibold ${
                    previewDifference === 0
                      ? 'text-[color:var(--color-muted)]'
                      : 'text-[color:var(--color-warning-ink)]'
                  }`}
                >
                  {previewDifference === 0
                    ? 'Matches expected'
                    : `Difference: ${formatPackDifference(previewDifference)}`}
                </span>
              )}
            </span>
          </div>

          <p className="text-[11px] text-[color:var(--color-muted)]">
            Saving records the count only. Stock balances change after an owner
            approves the stocktake, and later sales or receipts are kept.
          </p>

          {error && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-4 text-sm font-medium text-[color:var(--color-danger-ink)]">
              <AlertCircleIcon size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !validation.valid}
              className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-sm font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-xs"
            >
              {submitting
                ? 'Saving…'
                : item.countedPacks === null
                  ? 'Save count'
                  : 'Update count'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
