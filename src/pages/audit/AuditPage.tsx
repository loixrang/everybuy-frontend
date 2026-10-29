import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '../../lib/api/audit';
import { ApiError } from '../../lib/api/client';
import { formatLongDate } from '../../lib/utils/format';
import {
  AlertCircleIcon,
  HistoryIcon,
  RefreshCwIcon,
  SearchIcon,
} from '../../components/ui/Icons';
import type { AuditEntry } from '../../types/audit';

function detailSummary(detail: Record<string, unknown> | null): string {
  if (!detail) return '—';
  const title = typeof detail.title === 'string' ? detail.title : null;
  const amount = typeof detail.amount === 'string' ? detail.amount : null;

  if (title && amount) return `${title} · ₦${amount}`;
  if (title) return title;
  if (amount) return `₦${amount}`;

  const keys = Object.keys(detail);
  return keys.length > 0 ? keys.join(', ') : '—';
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAuditLog();
        if (ignore) return;
        setEntries(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (entry) =>
        entry.actor.toLowerCase().includes(term) ||
        entry.action.toLowerCase().includes(term) ||
        entry.entity.toLowerCase().includes(term) ||
        entry.entityId.toLowerCase().includes(term),
    );
  }, [entries, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
          Audit log
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Read-only record of actions the backend audits.
        </p>
      </div>

      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] px-4 py-3">
        <p className="text-xs text-[color:var(--color-muted)]">
          The backend currently writes audit entries only when an expense is
          recorded. Sales, stock and staff changes are not audited yet.
        </p>
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
              placeholder="Actor, action, entity or id"
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
                  : 'Unable to load the audit log'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Viewing the audit log requires staff authorization.'
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
        <AuditSkeleton />
      ) : entries.length === 0 && !error ? (
        <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 md:p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] flex items-center justify-center mb-4">
            <HistoryIcon size={32} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[color:var(--color-ink)]">
            Nothing audited yet
          </h2>
          <p className="text-sm md:text-base text-[color:var(--color-muted)] max-w-md mx-auto mt-2">
            Record an expense and its audit entry will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No matching entries
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
                    When
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Actor
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Action
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Entity
                  </th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {filtered.map((entry, index) => (
                  <tr key={`${entry.entityId}-${entry.at}-${index}`}>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] whitespace-nowrap">
                      {formatLongDate(entry.at)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]">
                      {entry.actor}
                    </td>
                    <td className="py-3 px-4">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                      <span className="capitalize">{entry.entity}</span>
                      <span
                        className="block text-[11px] text-[color:var(--color-quiet)]"
                        title={entry.entityId}
                      >
                        #{entry.entityId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[color:var(--color-muted)] max-w-[280px] truncate">
                      {detailSummary(entry.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((entry, index) => (
              <div
                key={`${entry.entityId}-${entry.at}-${index}`}
                className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {entry.actor}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-0.5">
                      {formatLongDate(entry.at)}
                    </p>
                  </div>
                  <ActionBadge action={entry.action} />
                </div>
                <p className="text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3">
                  <span className="capitalize">{entry.entity}</span> ·{' '}
                  <span title={entry.entityId}>
                    #{entry.entityId.slice(0, 8)}
                  </span>
                </p>
                <p className="text-xs text-[color:var(--color-ink)] mt-1">
                  {detailSummary(entry.detail)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[color:var(--color-muted)]">
            {filtered.length} of {entries.length}{' '}
            {entries.length === 1 ? 'entry' : 'entries'} shown · newest first.
            The audit log is not paginated by the backend.
          </p>
        </>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]">
      {action}
    </span>
  );
}

function AuditSkeleton() {
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
