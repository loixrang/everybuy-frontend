/**
 * Money helpers using integer kobo arithmetic.
 * Ported from the backend (src/common/utils/money.ts) so client-side totals
 * match the server exactly and never drift through floating point.
 */

export function toKobo(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);

  if (!match) {
    throw new Error(`Invalid money value: ${value}`);
  }

  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'));
  const amount = whole * 100n + fraction;

  return match[1] === '-' ? -amount : amount;
}

export function fromKobo(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const naira = absolute / 100n;
  const kobo = (absolute % 100n).toString().padStart(2, '0');

  return `${negative ? '-' : ''}${naira}.${kobo}`;
}
