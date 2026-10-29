import { useRef, useState } from 'react';
import { createExpense } from '../../lib/api/expenses';
import { ApiError } from '../../lib/api/client';
import { formatNaira } from '../../lib/utils/format';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

interface RecordExpenseModalProps {
  onClose: () => void;
  onRecorded: (message: string) => void;
}

// Matches the backend createExpenseSchema.
const AMOUNT_PATTERN = /^(?=.*[1-9])\d{1,12}(\.\d{1,2})?$/;
const MAX_TITLE = 120;
const MAX_CATEGORY = 80;
const MAX_NOTES = 500;

const SUGGESTED_CATEGORIES = [
  'Stock purchase',
  'Transport',
  'Rent',
  'Utilities',
  'Salaries',
  'Packaging',
  'Other',
];

/**
 * Records a shop expense (`POST /api/v1/expenses`).
 *
 * The backend uses `requestId` for idempotency. The id is kept for retries of
 * the same payload but regenerated when the form changes, so resubmitting an
 * unchanged form replays the stored expense instead of duplicating it. The UI
 * never retries on its own.
 */
export function RecordExpenseModal({
  onClose,
  onRecorded,
}: RecordExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [spentAt, setSpentAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const requestIdRef = useRef<{ id: string; payload: string } | null>(null);

  function buildPayload() {
    const spentAtIso = spentAt ? new Date(spentAt).toISOString() : undefined;
    return JSON.stringify({
      title: title.trim(),
      category: category.trim(),
      amount: amount.trim(),
      notes: notes.trim() || null,
      spentAt: spentAtIso ?? null,
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setHint(null);

    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    const trimmedAmount = amount.trim();

    if (!trimmedTitle) {
      setError('Enter what the expense was for.');
      return;
    }
    if (trimmedTitle.length > MAX_TITLE) {
      setError(`Keep the title to ${MAX_TITLE} characters or fewer.`);
      return;
    }
    if (!trimmedCategory) {
      setError('Enter a category.');
      return;
    }
    if (trimmedCategory.length > MAX_CATEGORY) {
      setError(`Keep the category to ${MAX_CATEGORY} characters or fewer.`);
      return;
    }
    if (!AMOUNT_PATTERN.test(trimmedAmount)) {
      setError(
        'Enter an amount greater than zero with at most 2 decimal places.',
      );
      return;
    }
    if (notes.trim().length > MAX_NOTES) {
      setError(`Keep the notes to ${MAX_NOTES} characters or fewer.`);
      return;
    }
    if (spentAt && Number.isNaN(new Date(spentAt).getTime())) {
      setError('Enter a valid date and time.');
      return;
    }

    const payload = buildPayload();
    if (!requestIdRef.current || requestIdRef.current.payload !== payload) {
      requestIdRef.current = { id: crypto.randomUUID(), payload };
    }

    setSubmitting(true);
    try {
      await createExpense({
        requestId: requestIdRef.current.id,
        title: trimmedTitle,
        category: trimmedCategory,
        amount: trimmedAmount,
        notes: notes.trim() || undefined,
        spentAt: spentAt ? new Date(spentAt).toISOString() : undefined,
      });
      onRecorded(
        `${formatNaira(trimmedAmount)} recorded for ${trimmedTitle}.`,
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 409) {
          setHint(
            'This submission was already used for a different expense. Change the details and try again.',
          );
        } else if (err.status >= 500) {
          setHint(
            'The backend may have saved the expense before failing. Reload the list; resubmitting the unchanged form is safe because it reuses the same request id.',
          );
        }
      } else {
        setError(
          'Unable to reach the backend. Check that it is running and try again.',
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
        aria-label="Close dialog"
        onClick={() => {
          if (!submitting) onClose();
        }}
        className="absolute inset-0 bg-[color:var(--color-scrim)] cursor-pointer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-modal-title"
        className="relative w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="expense-modal-title"
              className="text-lg font-bold text-[color:var(--color-ink)]"
            >
              Record an expense
            </h2>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              Expenses reduce the shop&rsquo;s net profit for the month.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-[8px] flex items-center justify-center text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="expense-title"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              What was it for?
            </label>
            <input
              id="expense-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              placeholder="Generator fuel"
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expense-category"
                className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
              >
                Category
              </label>
              <input
                id="expense-category"
                type="text"
                list="expense-categories"
                value={category}
                maxLength={MAX_CATEGORY}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setError(null);
                }}
                placeholder="Transport"
                className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              <datalist id="expense-categories">
                {SUGGESTED_CATEGORIES.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="expense-amount"
                className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
              >
                Amount (₦)
              </label>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                }}
                placeholder="e.g. 4500"
                className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="expense-spent-at"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              When{' '}
              <span className="font-normal text-[color:var(--color-muted)]">
                (optional, defaults to now)
              </span>
            </label>
            <input
              id="expense-spent-at"
              type="datetime-local"
              value={spentAt}
              onChange={(event) => {
                setSpentAt(event.target.value);
                setError(null);
              }}
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
          </div>

          <div>
            <label
              htmlFor="expense-notes"
              className="block text-sm font-semibold text-[color:var(--color-ink)] mb-2"
            >
              Notes{' '}
              <span className="font-normal text-[color:var(--color-muted)]">
                (optional)
              </span>
            </label>
            <textarea
              id="expense-notes"
              value={notes}
              maxLength={MAX_NOTES}
              rows={2}
              onChange={(event) => {
                setNotes(event.target.value);
                setError(null);
              }}
              placeholder="Receipt number, supplier, or reason"
              className="w-full px-3 py-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)] resize-y"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
            >
              <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {hint && <p className="text-[color:var(--color-muted)]">{hint}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 px-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-5 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Record expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
