import { useCallback, useMemo, useRef, useState } from 'react';
import type { CustomerPickerCustomer } from './CustomerRow';
import { CustomerBalanceLine } from './CustomerBalanceLine';
import { CustomerPickerSheet } from './CustomerPickerSheet';
import { ChevronDownIcon } from '../ui/Icons';

interface CustomerPickerProps {
  id?: string;
  customers: CustomerPickerCustomer[];
  value: string | null;
  onChange: (customerId: string | null) => void;
  onAddCustomer: () => void;
}

/**
 * Sale-screen trigger that opens the customer bottom sheet. `null` means the
 * sale is paid in full with no customer attached.
 */
export function CustomerPicker({
  id,
  customers,
  value,
  onChange,
  onAddCustomer,
}: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedCustomer = useMemo(
    () => (value ? customers.find((customer) => customer.id === value) ?? null : null),
    [customers, value],
  );

  const closeSheet = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  function handleSelect(customerId: string | null) {
    onChange(customerId);
    closeSheet();
  }

  function handleAddCustomer() {
    setOpen(false);
    onAddCustomer();
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-2 text-left transition-colors hover:bg-[color:var(--color-subtle)] focus:border-[color:var(--color-accent)]"
      >
        <span className="min-w-0 flex-1">
          {selectedCustomer ? (
            <>
              <span className="block truncate text-[15px] font-medium text-[color:var(--color-ink)]">
                {selectedCustomer.name}
              </span>
              <CustomerBalanceLine balance={selectedCustomer.balance} />
            </>
          ) : value ? (
            <span className="block text-[15px] font-medium text-[color:var(--color-ink)]">
              Customer selected
            </span>
          ) : (
            <>
              <span className="block text-[15px] font-medium text-[color:var(--color-ink)]">
                Full payment
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[color:var(--color-muted)]">
                No customer attached
              </span>
            </>
          )}
        </span>
        <ChevronDownIcon
          size={18}
          aria-hidden="true"
          className="shrink-0 text-[color:var(--color-muted)]"
        />
      </button>

      {open && (
        <CustomerPickerSheet
          customers={customers}
          selectedCustomerId={value}
          onSelect={handleSelect}
          onClose={closeSheet}
          onAddCustomer={handleAddCustomer}
        />
      )}
    </>
  );
}
