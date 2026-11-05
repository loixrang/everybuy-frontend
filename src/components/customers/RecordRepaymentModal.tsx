import { useRef, useState } from 'react';
import type { RecordRepaymentResult, StatementSale } from '../../types/customer';
import { recordRepayment } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import { formatNaira, formatShortDate, trimMoney } from '../../lib/utils/format';
import { fromKobo, toKobo } from '../../lib/utils/money';
import { AlertCircleIcon, XIcon } from '../ui/Icons';
import { SheetSelect } from '../ui/SheetSelect';

interface RecordRepaymentModalProps {
  customerId: string;
  customerName: string;
  /** Only sales with an outstanding balance, as computed by the backend. */
  sales: StatementSale[];
  initialSaleId?: string;
  onClose: () => void;
  onRecorded: (result: RecordRepaymentResult, saleId: string, amount: string) => void;
}

// Matches the backend recordRepaymentSchema.
const AMOUNT_PATTERN = /^(?=.*[1-9])\d{1,12}(\.\d{1,2})?$/;

export function RecordRepaymentModal({
  customerId,
  customerName,
  sales,
  initialSaleId,
  onClose,
  onRecorded,
}: RecordRepaymentModalProps) {
  const [saleId, setSaleId] = useState(() => {
    if (initialSaleId && sales.some((sale) => sale.id === initialSaleId)) {
      return initialSaleId;
    }
    return sales[0]?.id ?? '';
  });
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The backend treats requestId as the idempotency key. Keep it across
   * retries of the same repayment, but regenerate it whenever the repayment
   * being submitted changes.
   */
  const requestIdRef = useRef<string | null>(null);

  const selectedSale = sales.find((sale) => sale.id === saleId) ?? null;
  const balanceKobo = selectedSale ? toKobo(selectedSale.balanceDue) : 0n;

  const amountValid = AMOUNT_PATTERN.test(amount.trim());
  const amountKobo = amountValid ? toKobo(amount.trim()) : 0n;
  const overBalance = amountValid && amountKobo > balanceKobo;
  const previewKobo =
    amountValid && !overBalance && amountKobo <= balanceKobo
      ? balanceKobo - amountKobo
      : null;

  function changeSale(nextSaleId: string) {
    setSaleId(nextSaleId);
    setError(null);
    requestIdRef.current = null;
  }

  function changeAmount(nextAmount: string) {
    setAmount(nextAmount);
    setError(null);
    requestIdRef.current = null;
  }

  function handleUseFullBalance() {
    if (!selectedSale) return;
    changeAmount(trimMoney(selectedSale.balanceDue));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedSale) {
      setError('Select an outstanding sale to repay.');
      return;
    }
    const trimmedAmount = amount.trim();
    if (!AMOUNT_PATTERN.test(trimmedAmount)) {
      setError('Enter an amount greater than zero with at most 2 decimal places.');
      return;
    }
    if (toKobo(trimmedAmount) > balanceKobo) {
      setError(`The repayment cannot exceed the ${formatNaira(selectedSale.balanceDue)} outstanding balance.`);
      return;
    }

    if (!requestIdRef.current) {
      requestIdRef.current = crypto.randomUUID();
    }

    setSubmitting(true);
    try {
      const result = await recordRepayment(customerId, {
        requestId: requestIdRef.current,
        saleId: selectedSale.id,
        amount: trimmedAmount,
      });
      // Only clear the idempotency key after the backend confirms the payment.
      requestIdRef.current = null;
      onRecorded(result, selectedSale.id, trimmedAmount);
      onClose();
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 403) {
        setError('Forbidden: your account does not have staff access.');
      } else if (apiErr?.status === 404) {
        setError('This customer or sale no longer exists. Reload the statement and try again.');
      } else if (apiErr?.status === 409) {
        setError(
          apiErr.message ||
            'This sale no longer has an outstanding balance. Reload the statement.',
        );
      } else if (apiErr?.status === 400) {
        setError(apiErr.message || 'The repayment was rejected. Check the amount and try again.');
      } else if (apiErr?.status === 429) {
        setError('Too many requests. Wait a moment and try again.');
      } else {
        setError(
          apiErr?.message ||
            'Unable to record the repayment. Check your connection and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 glass-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="repayment-title"
        className="glass-panel relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] pb-[env(safe-area-inset-bottom)] sm:pb-0"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[color:var(--color-border)]">
          <div>
            <h2 id="repayment-title" className="text-lg font-bold text-[color:var(--color-ink)]">
              Record repayment
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              {customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-[8px] text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-[color:var(--color-muted)]">
              This customer has no outstanding balance to repay.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="repayment-sale"
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Apply to sale
              </label>
              <SheetSelect
                id="repayment-sale"
                label="Apply to sale"
                searchPlaceholder="Search sales"
                value={saleId}
                onChange={changeSale}
                options={sales.map((sale) => ({
                  value: sale.id,
                  label: `Sale #${sale.id.slice(0, 8)} · ${formatShortDate(sale.soldAt)}`,
                  sublabel: `${formatNaira(sale.balanceDue)} owed`,
                }))}
              />
            </div>

            <div className="px-4 py-3 rounded-[8px] bg-[color:var(--color-subtle)] flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--color-muted)]">
                Outstanding on this sale
              </span>
              <span className="text-base font-bold text-[color:var(--color-ink)]">
                {formatNaira(selectedSale?.balanceDue ?? '0')}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="repayment-amount"
                  className="block text-xs font-semibold text-[color:var(--color-ink)]"
                >
                  Amount received (₦)
                </label>
                <button
                  type="button"
                  onClick={handleUseFullBalance}
                  className="text-[11px] font-semibold text-[color:var(--color-accent-ink)] underline underline-offset-2"
                >
                  Use full balance
                </button>
              </div>
              <input
                id="repayment-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => changeAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              <p className="text-[11px] text-[color:var(--color-muted)]">
                Greater than zero, at most 2 decimal places, and no more than the outstanding balance.
              </p>
            </div>

            {previewKobo !== null && (
              <div className="px-4 py-3 rounded-[8px] bg-[color:var(--color-accent-soft)] text-xs text-[color:var(--color-muted)] flex items-center justify-between gap-3">
                <span>Balance after repayment (preview)</span>
                <span className="text-sm font-bold text-[color:var(--color-accent-ink)]">
                  {formatNaira(fromKobo(previewKobo))}
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-[8px] bg-[color:var(--color-danger-bg)] text-xs font-medium text-[color:var(--color-danger-ink)] flex items-start gap-2">
                <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
                {submitting ? 'Saving…' : 'Save repayment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
