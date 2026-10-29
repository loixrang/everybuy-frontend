import { describe, expect, test } from 'bun:test';
import { fromKobo, toKobo } from './money';

describe('toKobo', () => {
  test('converts whole naira', () => {
    expect(toKobo('9800.00')).toBe(980000n);
    expect(toKobo('0.00')).toBe(0n);
    expect(toKobo('4500')).toBe(450000n);
  });

  test('handles one and two decimal places', () => {
    expect(toKobo('19.5')).toBe(1950n);
    expect(toKobo('19.05')).toBe(1905n);
    expect(toKobo('0.01')).toBe(1n);
  });

  test('handles negatives', () => {
    expect(toKobo('-12.34')).toBe(-1234n);
  });

  test('rejects malformed values', () => {
    expect(() => toKobo('')).toThrow();
    expect(() => toKobo('12.345')).toThrow();
    expect(() => toKobo('abc')).toThrow();
    expect(() => toKobo('1,000.00')).toThrow();
  });
});

describe('fromKobo', () => {
  test('formats with two decimals', () => {
    expect(fromKobo(980000n)).toBe('9800.00');
    expect(fromKobo(1n)).toBe('0.01');
    expect(fromKobo(0n)).toBe('0.00');
    expect(fromKobo(-1234n)).toBe('-12.34');
  });

  test('round-trips with toKobo', () => {
    for (const value of ['0.00', '0.01', '19.05', '19.5', '9800.00', '-42.10']) {
      expect(fromKobo(toKobo(value))).toBe(
        value.includes('.') && value.split('.')[1].length === 1
          ? `${value}0`
          : value,
      );
    }
  });
});
