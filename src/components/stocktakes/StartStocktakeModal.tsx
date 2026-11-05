import { useId, useState } from 'react';
import { createStockTake } from '../../lib/api/stockTakes';
import { describeStockTakeError } from '../../lib/stocktakes';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

interface StartStocktakeModalProps {
  onClose: () => void;
  onCreated: (stockTakeId: string) => void;
}

const MAX_NAME_LENGTH = 100;

/**
 * Starts a stocktake. The backend snapshots every active product and its
 * current pack balance, so the dialog explains that the count begins from
 * today's stock rather than asking for products.
 */
export function StartStocktakeModal({ onClose, onCreated }: StartStocktakeModalProps) {
  const titleId = useId();
  const inputId = useId();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Give this stocktake a name, for example “October stock count”.');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`The name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const created = await createStockTake({ name: trimmed });
      onCreated(created.id);
      onClose();
    } catch (err: unknown) {
      setError(describeStockTakeError(err, 'create'));
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
        className="glass-panel relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[16px] pb-[env(safe-area-inset-bottom)] sm:max-w-[480px] sm:rounded-[12px] sm:pb-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-6 pb-4 pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-[color:var(--color-ink)]">
              Start stocktake
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              Every active product is added with its current stock.
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
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Stocktake name
            </label>
            <input
              id={inputId}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              placeholder="October 2026 stock count"
              className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <p className="text-[11px] text-[color:var(--color-muted)]">
              The expected quantity for each product is saved when the stocktake
              starts. Counts do not change stock until an owner approves them.
            </p>
          </div>

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
              disabled={submitting}
              className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-sm font-semibold text-[color:var(--color-on-accent)] transition-colors hover:bg-[color:var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-xs"
            >
              {submitting ? 'Starting…' : 'Start stocktake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
