import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CustomerPickerCustomer } from './CustomerRow';
import { CustomerRow } from './CustomerRow';
import { PlusIcon, SearchIcon, XIcon } from '../ui/Icons';

type PickerMode = 'full' | 'customer';

interface CustomerPickerSheetProps {
  customers: CustomerPickerCustomer[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
  onClose: () => void;
  onAddCustomer: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Bottom-sheet customer picker. Keeps the header, mode toggle and search fixed
 * while only the customer list scrolls, and closes on Escape, backdrop tap,
 * the close button, or a selection.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query),
    );
  }, [customers, search]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || activeElement === panelRef.current) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function chooseFullPayment() {
    setMode('full');
    onSelect(null);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close customer picker"
        onClick={onClose}
        className="sheet-backdrop-enter absolute inset-0 bg-[color:var(--color-scrim)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-panel-enter relative z-10 flex max-h-[70dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-xl focus:outline-none"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 mb-1 h-1 w-9 rounded-full bg-[color:var(--color-border)]"
        />

        <div className="flex items-start justify-between gap-4 px-5 pb-3">
          <h2
            id={titleId}
            className="text-lg font-bold text-[color:var(--color-ink)]"
          >
            Who is buying?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 -mr-2 items-center justify-center rounded-[8px] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)]"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-5 pb-3">
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
          <div className="px-5 pb-3">
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

        <div className="border-t border-[color:var(--color-border)] px-5 py-3">
          <button
            type="button"
            onClick={onAddCustomer}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-subtle)]"
          >
            <PlusIcon size={16} />
            New customer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
