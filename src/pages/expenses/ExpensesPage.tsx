import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchExpenses } from '../../lib/api/expenses';
import { ApiError } from '../../lib/api/client';
import {
  currentLagosMonth,
  formatMonthLabel,
  formatMovementDate,
  formatNaira,
  lagosMonthOf,
} from '../../lib/utils/format';
import { toKobo, fromKobo } from '../../lib/utils/money';
import { matchesSearch } from '../../lib/utils/search';
import { RecordExpenseModal } from '../../components/expenses/RecordExpenseModal';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  WalletIcon,
  XIcon,
} from '../../components/ui/Icons';
import type { Expense } from '../../types/expense';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchExpenses();
        if (ignore) return;
        setExpenses(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect. Check your connection and try again.',
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
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const thisMonth = useMemo(() => currentLagosMonth(), []);

  const totals = useMemo(() => {
    let all = 0n;
    let month = 0n;
    for (const expense of expenses) {
      let amount: bigint;
      try {
        amount = toKobo(expense.amount);
      } catch {
        continue;
      }
      all += amount;
      if (lagosMonthOf(expense.spentAt) === thisMonth) month += amount;
    }
    return { all, month };
  }, [expenses, thisMonth]);

  const filtered = useMemo(() => {
    const term = search.trim();
    if (!term) return expenses;
    return expenses.filter((expense) =>
      matchesSearch(
        [expense.title, expense.category, expense.notes ?? ''].join(' '),
        term,
      ),
    );
  }, [expenses, search]);

  function handleRecorded(message: string) {
    setModalOpen(false);
    setNotice(message);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Expenses
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Shop spending recorded by staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0"
        >
          <PlusIcon size={16} />
          Record expense
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircleIcon
              size={20}
              className="shrink-0 mt-0.5 text-[color:var(--color-success-ink)]"
            />
            <p className="text-sm text-[color:var(--color-success-ink)]">
              {notice}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="This month"
          value={formatNaira(fromKobo(totals.month))}
          detail={formatMonthLabel(thisMonth)}
        />
        <SummaryCard
          label="All recorded"
          value={formatNaira(fromKobo(totals.all))}
          detail="All recorded shop expenses"
        />
        <SummaryCard
          label="Expenses recorded"
          value={String(expenses.length)}
          detail={
            expenses.length === 1 ? '1 entry' : `${expenses.length} entries`
          }
        />
      </div>

      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, category or notes"
              maxLength={120}
              className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]"
            />
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon
              className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                {error.status === 401 || error.status === 403
                  ? 'Staff access required'
                  : 'Unable to load expenses'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Viewing expenses requires staff authorization.'
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
        <ExpensesSkeleton />
      ) : expenses.length === 0 && !error ? (
        <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 md:p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] flex items-center justify-center mb-4">
            <WalletIcon size={32} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[color:var(--color-ink)]">
            No expenses recorded
          </h2>
          <p className="text-sm md:text-base text-[color:var(--color-muted)] max-w-md mx-auto mt-2 mb-6">
            Record fuel, transport, rent or stock purchases so the monthly profit
            report stays accurate.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            <PlusIcon size={16} />
            Record expense
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No matching expenses
          </p>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Try a different search term.
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-4 h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Date
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Expense
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Category
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Notes
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {filtered.map((expense) => (
                  <tr key={expense.id}>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] whitespace-nowrap">
                      {formatMovementDate(expense.spentAt)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]">
                      {expense.title}
                    </td>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                      {expense.category}
                    </td>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] max-w-[280px] truncate">
                      {expense.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right whitespace-nowrap">
                      {formatNaira(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((expense) => (
              <div
                key={expense.id}
                className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {expense.title}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-0.5">
                      {expense.category} · {formatMovementDate(expense.spentAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[color:var(--color-ink)] shrink-0">
                    {formatNaira(expense.amount)}
                  </p>
                </div>
                {expense.notes && (
                  <p className="text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3 whitespace-pre-line">
                    {expense.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-[color:var(--color-muted)]">
            {filtered.length} of {expenses.length}{' '}
            {expenses.length === 1 ? 'expense' : 'expenses'} shown · newest first.
          </p>
        </>
      )}

      {modalOpen && (
        <RecordExpenseModal
          onClose={() => setModalOpen(false)}
          onRecorded={handleRecorded}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
      <p className="text-xs font-semibold text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] mt-2">
        {value}
      </p>
      <p className="text-xs text-[color:var(--color-muted)] mt-1">{detail}</p>
    </div>
  );
}

function ExpensesSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="h-14 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
        />
      ))}
    </div>
  );
}
