import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { createStockAdjustment } from '../../lib/api/stock';
import type { UpdatedProductStock } from '../../types/stock';
import { ApiError } from '../../lib/api/client';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

interface StockAdjustmentModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: (result: { updatedProducts: UpdatedProductStock[]; note: string }) => void;
}

type AdjustmentSign = 'Add' | 'Sub';

// Matches the backend adjustmentSchema: quantity is an integer from 1 to 1,000,000.
const MAX_QUANTITY = 1_000_000;

export function StockAdjustmentModal({ product, onClose, onSuccess }: StockAdjustmentModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [sign, setSign] = useState<AdjustmentSign>('Add');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /*
   * The backend requires a client-generated UUID requestId and replays the
   * original result if the same id is retried. Keeping the id across failed
   * attempts makes retries idempotent instead of double-applying the change.
   */
  const requestIdRef = useRef<string | null>(null);

  const parsedQuantity = Number(quantity);
  const isSub = sign === 'Sub';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (quantity.trim() === '' || !Number.isInteger(parsedQuantity)) {
      setSubmitError('Enter a whole number of packs.');
      return;
    }
    if (parsedQuantity < 1 || parsedQuantity > MAX_QUANTITY) {
      setSubmitError(`Quantity must be between 1 and ${MAX_QUANTITY.toLocaleString()} packs.`);
      return;
    }
    if (note.trim().length === 0) {
      setSubmitError('A reason is required and is recorded in the movement history.');
      return;
    }
    if (note.trim().length > 500) {
      setSubmitError('Reason must be at most 500 characters.');
      return;
    }
    if (!isSub && product.costPerPack === null) {
      setSubmitError('This product has no recorded acquisition cost. Record its known cost per pack in product setup before increasing stock.');
      return;
    }

    if (!requestIdRef.current) {
      requestIdRef.current = crypto.randomUUID();
    }

    setSubmitting(true);
    try {
      const result = await createStockAdjustment({
        requestId: requestIdRef.current,
        productId: product.id,
        changePack: sign,
        unit: 'Pack',
        quantity: parsedQuantity,
        note: note.trim(),
      });

      // Only clear the idempotency key once the backend confirms success.
      requestIdRef.current = null;

      onSuccess({ updatedProducts: result.updateProduct, note: note.trim() });
      onClose();
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 403) {
        setSubmitError('Forbidden: only owners can adjust stock.');
      } else if (apiErr?.status === 404) {
        setSubmitError('The selected product no longer exists. Reload the page and try again.');
      } else if (apiErr?.status === 409) {
        setSubmitError(
          isSub
            ? 'Not enough stock for this removal. The balance may have changed — reload and try again.'
            : apiErr.message,
        );
      } else {
        setSubmitError(
          apiErr?.message ||
            'Unable to adjust stock. Check your connection and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentPacks = product.stockPacks || 0;
  const showProjected =
    quantity.trim() !== '' && Number.isInteger(parsedQuantity) && parsedQuantity >= 1;
  const projected = isSub ? currentPacks - parsedQuantity : currentPacks + parsedQuantity;
  const invalidProjected = showProjected && projected < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 glass-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjustment-title"
        className="glass-panel relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] pb-[env(safe-area-inset-bottom)] sm:pb-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[color:var(--color-border)]">
          <div>
            <h2
              id="stock-adjustment-title"
              className="text-lg font-bold text-[color:var(--color-ink)]"
            >
              Adjust stock
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              {product.name}
              {product.size ? ` · ${product.size}` : ''}
            </p>
          </div>

          {!isSub && product.costPerPack === null && (
            <div className="rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-warning-bg)] p-3 text-xs text-[color:var(--color-warning-ink)]">
              Stock cannot be increased while acquisition cost is missing. Enter the known cost in{' '}
              <Link className="font-semibold underline" to={`/inventory/${product.id}/edit`}>
                product setup
              </Link>
              . Stock reductions remain available.
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-[8px] text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-[8px] bg-[color:var(--color-subtle)]">
            <button
              type="button"
              onClick={() => setSign('Add')}
              aria-pressed={!isSub}
              className={`px-4 py-2 rounded-[6px] text-xs font-semibold transition-colors ${
                !isSub
                  ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
                  : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              Add stock
            </button>
            <button
              type="button"
              onClick={() => setSign('Sub')}
              aria-pressed={isSub}
              className={`px-4 py-2 rounded-[6px] text-xs font-semibold transition-colors ${
                isSub
                  ? 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]'
                  : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              Remove stock
            </button>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label
              htmlFor="adjust-quantity"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Quantity (packs)
            </label>
            <input
              id="adjust-quantity"
              type="number"
              min="1"
              max={MAX_QUANTITY}
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setSubmitError(null);
              }}
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
              placeholder="0"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label
              htmlFor="adjust-reason"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Reason
            </label>
            <textarea
              id="adjust-reason"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSubmitError(null);
              }}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)] resize-y"
              placeholder="Why is this adjustment being made?"
            />
            <span className="text-[11px] text-[color:var(--color-muted)]">
              Saved with the movement record. Maximum 500 characters.
            </span>
          </div>

          {/* Projected balance */}
          <div className="px-4 py-3 rounded-[8px] bg-[color:var(--color-subtle)] text-xs text-[color:var(--color-muted)]">
            Current stock:{' '}
            <span className="font-semibold text-[color:var(--color-ink)]">
              {currentPacks.toLocaleString()} packs
            </span>
            {showProjected && (
              <>
                {' → '}
                <span
                  className={`font-semibold ${
                    invalidProjected
                      ? 'text-[color:var(--color-danger-ink)]'
                      : 'text-[color:var(--color-ink)]'
                  }`}
                >
                  {projected.toLocaleString()} packs
                </span>
              </>
            )}
            {invalidProjected && (
              <span className="block mt-1 text-[color:var(--color-danger-ink)]">
                Not enough stock for this removal.
              </span>
            )}
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="p-4 rounded-[12px] bg-[color:var(--color-danger-bg)] border border-[color:var(--color-border)] text-sm font-medium text-[color:var(--color-danger-ink)] flex items-start gap-3">
              <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Saving…'
                : isSub
                  ? `Remove ${parsedQuantity > 0 ? parsedQuantity.toLocaleString() : ''} packs`
                  : `Add ${parsedQuantity > 0 ? parsedQuantity.toLocaleString() : ''} packs`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
