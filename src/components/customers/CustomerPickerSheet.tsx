import { useMemo, useState } from 'react';
import type { CustomerPickerCustomer } from './CustomerRow';
import { CustomerRow } from './CustomerRow';
import { BottomSheet } from '../ui/BottomSheet';
import { PlusIcon, SearchIcon } from '../ui/Icons';
import { matchesSearch } from '../../lib/utils/search';

type PickerMode = 'full' | 'customer';

interface CustomerPickerSheetProps {
  customers: CustomerPickerCustomer[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
  onClose: () => void;
  onAddCustomer: () => void;
}

/**
 * Bottom-sheet customer picker. Built on the shared BottomSheet so the header,
 * backdrop, focus trap and animation match every other dropdown. Keeps the
 * Full payment / Customer toggle, balances, search and New customer action.
 */
export function CustomerPickerSheet({
  customers,
  selectedCustomerId,
  onSelect,
  onClose,
  onAddCustomer,
}: CustomerPickerSheetProps) {
  const [mode, setMode] = useState<PickerMode>(
    selectedCustomerId ? 'customer' : 'full',
  );
  const [search, setSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    return customers.filter((customer) =>
      matchesSearch(customer.name, search),
    );
  }, [customers, search]);

  function chooseFullPayment() {
    setMode('full');
    onSelect(null);
    onClose();
  }

  return (
    <BottomSheet
      title="Who is buying?"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onAddCustomer}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)]"
        >
          <PlusIcon size={16} />
          New customer
        </button>
      }
    >
      <div className="shrink-0 px-5 pb-3">
        <div
          role="radiogroup"
          aria-label="Customer"
          className="flex gap-1 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'full'}
            onClick={chooseFullPayment}
            className={`h-10 flex-1 rounded-[6px] text-sm transition-colors ${
              mode === 'full'
                ? 'bg-[color:var(--color-accent-soft)] font-medium text-[color:var(--color-accent-ink)] shadow-sm'
                : 'font-normal text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            Full payment
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'customer'}
            onClick={() => setMode('customer')}
            className={`h-10 flex-1 rounded-[6px] text-sm transition-colors ${
              mode === 'customer'
                ? 'bg-[color:var(--color-accent-soft)] font-medium text-[color:var(--color-accent-ink)] shadow-sm'
                : 'font-normal text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            Customer
          </button>
        </div>
      </div>

      {mode === 'customer' && (
        <div className="shrink-0 px-5 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[color:var(--color-muted)]">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customers"
              aria-label="Search customers"
              autoComplete="off"
              className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-10 pr-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {mode === 'full' ? (
          <p className="px-5 py-8 text-center text-sm text-[color:var(--color-muted)]">
            Paid in full, no customer attached.
          </p>
        ) : filteredCustomers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[color:var(--color-muted)]">
            No match. Add them as a new customer.
          </p>
        ) : (
          <div role="group" aria-label="Customers">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                selected={customer.id === selectedCustomerId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
