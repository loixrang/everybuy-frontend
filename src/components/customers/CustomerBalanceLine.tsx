import { formatNaira } from '../../lib/utils/format';

export type CustomerBalance = string | number | null | undefined;

interface CustomerBalanceLineProps {
  balance: CustomerBalance;
  className?: string;
}

/**
 * Shows a customer's outstanding balance using the same backend value as the
 * Customers tab. A missing balance renders no line at all, so an unavailable
 * figure is never mistaken for a settled account.
 */
export function CustomerBalanceLine({
  balance,
  className = '',
}: CustomerBalanceLineProps) {
  if (balance === null || balance === undefined) return null;
  if (typeof balance === 'string' && balance.trim() === '') return null;

  const numericBalance = typeof balance === 'number' ? balance : Number(balance);
  if (!Number.isFinite(numericBalance)) return null;

  const owes = numericBalance > 0;

  return (
    <span
      className={`mt-0.5 block text-[13px] leading-snug ${
        owes
          ? 'text-[color:var(--color-warning-ink)]'
          : 'text-[color:var(--color-muted)]'
      } ${className}`}
    >
      {owes ? `Owes ${formatNaira(balance)}` : 'No balance'}
    </span>
  );
}
