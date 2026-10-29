import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCustomers } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import { formatNaira, formatShortDate } from '../../lib/utils/format';
import { AddCustomerModal } from '../../components/customers/AddCustomerModal';
import { CustomerStatusBadge } from '../../components/customers/CustomerStatusBadge';
import {
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from '../../components/ui/Icons';
import type { Customer, CustomerListItem } from '../../types/customer';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All customers', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<CustomerListItem | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setError(null);
      try {
        const result = await fetchCustomers();
        if (ignore) return;
        setCustomers(result);
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

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedCustomers.filter((customer) => {
      if (statusFilter === 'ACTIVE' && !customer.active) return false;
      if (statusFilter === 'INACTIVE' && customer.active) return false;
      if (!query) return true;
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.phone ?? '').toLowerCase().includes(query)
      );
    });
  }, [sortedCustomers, search, statusFilter]);

  const activeCount = customers.filter((customer) => customer.active).length;
  const totalOutstanding = customers.reduce(
    (sum, customer) => sum + Number(customer.balance || 0),
    0,
  );
  const hasFilters = search.trim().length > 0 || statusFilter !== 'ALL';

  function handleCustomerCreated(customer: Customer) {
    const listItem: CustomerListItem = {
      ...customer,
      balance: '0.00',
      lastSaleAt: null,
      totalPurchases: '0.00',
    };
    setCustomers((current) => [...current, listItem]);
    setCreatedCustomer(listItem);
    setSearch('');
    setStatusFilter('ALL');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Customers
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Contact details, credit statements and repayments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0"
        >
          <PlusIcon size={16} />
          Add customer
        </button>
      </div>

      {createdCustomer && (
        <div
          role="status"
          className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] flex items-start justify-between gap-3"
        >
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-success-ink)]">
              {createdCustomer.name} added
            </p>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              Open the customer to view their statement and record repayments.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/customers/${createdCustomer.id}`}
              className="text-xs font-semibold text-[color:var(--color-accent-ink)] underline underline-offset-2"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => setCreatedCustomer(null)}
              aria-label="Dismiss"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                {error.status === 401 || error.status === 403
                  ? 'Staff access required'
                  : 'Unable to load customers'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Viewing customers requires staff authorization. Sign in with a staff account.'
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

      <div className="space-y-1.5">
        <label htmlFor="customer-search" className="block text-xs font-semibold text-[color:var(--color-ink)]">
          Search
        </label>
        <div className="relative max-w-xl">
          <input
            id="customer-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            className="w-full h-[46px] pl-10 pr-9 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-muted)]">
            <SearchIcon size={18} />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
              aria-label="Clear search"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              aria-pressed={isActive}
              className={`h-11 px-4 rounded-[8px] text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] border border-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-surface)] text-[color:var(--color-muted)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-subtle)]'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="h-11 px-3 rounded-[8px] text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] whitespace-nowrap transition-colors shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <CustomersSkeleton />
      ) : customers.length === 0 && !error ? (
        <EmptyCustomersState onAdd={() => setShowAddCustomer(true)} />
      ) : filteredCustomers.length === 0 ? (
        <NoCustomerResults
          onClear={() => {
            setSearch('');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <>
          <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Customer</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Phone</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Balance</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Last sale</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Status</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[color:var(--color-subtle)]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="font-semibold text-sm text-[color:var(--color-ink)] group-hover:text-[color:var(--color-accent)] transition-colors"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {customer.phone || '—'}
                    </td>
                    <td
                      className={`py-4 px-4 text-sm font-semibold text-right ${
                        Number(customer.balance) > 0
                          ? 'text-[color:var(--color-danger-ink)]'
                          : 'text-[color:var(--color-muted)]'
                      }`}
                    >
                      {formatNaira(customer.balance)}
                    </td>
                    <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                      {customer.lastSaleAt ? formatShortDate(customer.lastSaleAt) : '—'}
                    </td>
                    <td className="py-4 px-4">
                      <CustomerStatusBadge active={customer.active} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/customers/${customer.id}`}
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
            {filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 hover:border-[color:var(--color-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[color:var(--color-ink)] truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)] mt-1">
                      {customer.phone || 'No phone number'}
                    </div>
                  </div>
                  <CustomerStatusBadge active={customer.active} />
                </div>
                <div className="text-xs text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3 flex items-center justify-between">
                  <span>
                    {Number(customer.balance) > 0
                      ? `Owes ${formatNaira(customer.balance)}`
                      : 'No balance'}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[color:var(--color-accent-ink)]">
                    Statement
                    <ChevronRightIcon size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[color:var(--color-muted)]">
            <p className="font-medium">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'} shown
              {activeCount !== customers.length ? ` · ${activeCount} active` : ''}
            </p>
            <p>
              Total outstanding: {formatNaira(String(totalOutstanding))}
            </p>
          </div>
        </>
      )}

      {showAddCustomer && (
        <AddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onCreated={handleCustomerCreated}
        />
      )}
    </div>
  );
}

function EmptyCustomersState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 md:p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] flex items-center justify-center mb-4">
        <UsersIcon size={32} />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-[color:var(--color-ink)]">
        Add your first customer
      </h2>
      <p className="text-sm md:text-base text-[color:var(--color-muted)] max-w-md mx-auto mt-2 mb-6">
        Customer records keep credit sales and later repayments linked to the right person.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
      >
        <PlusIcon size={16} />
        Add customer
      </button>
    </div>
  );
}

function NoCustomerResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-[color:var(--color-subtle)] text-[color:var(--color-muted)] flex items-center justify-center mb-3">
        <SearchIcon size={24} />
      </div>
      <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
        No matching customers
      </h2>
      <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
        Try a different name or phone number, or clear the status filter.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
        <div className="h-10 bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]" />
        <div className="divide-y divide-[color:var(--color-border)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="h-5 w-52 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-32 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-5 w-16 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
      <div className="lg:hidden space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 space-y-3 animate-pulse"
          >
            <div className="h-5 w-40 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-32 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-full bg-[color:var(--color-subtle)] rounded-[4px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
