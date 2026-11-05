import type { CustomerBalance } from './CustomerBalanceLine';
import { CustomerBalanceLine } from './CustomerBalanceLine';
import { getInitials } from '../../lib/utils/initials';
import { CheckIcon } from '../ui/Icons';

export interface CustomerPickerCustomer {
  id: string;
  name: string;
  balance?: CustomerBalance;
}

interface CustomerRowProps {
  customer: CustomerPickerCustomer;
  selected: boolean;
  onSelect: (customerId: string) => void;
}

export function CustomerRow({
  customer,
  selected,
  onSelect,
}: CustomerRowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(customer.id)}
      className="flex min-h-[60px] w-full items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)]"
    >
      <span
        aria-hidden="true"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-sm font-semibold text-[color:var(--color-accent-ink)]"
      >
        {getInitials(customer.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] leading-snug text-[color:var(--color-ink)] ${
            selected ? 'font-medium' : 'font-normal'
          }`}
        >
          {customer.name}
        </span>
        <CustomerBalanceLine balance={customer.balance} />
      </span>

      {selected && (
        <CheckIcon
          size={20}
          aria-hidden="true"
          className="shrink-0 text-[color:var(--color-accent)]"
        />
      )}
    </button>
  );
}
