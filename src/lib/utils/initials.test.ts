import { describe, expect, test } from 'bun:test';
import { getInitials } from './initials';

describe('getInitials', () => {
  test('uses the first letter of the first two words', () => {
    expect(getInitials('Itoro Essien')).toBe('IE');
    expect(getInitials('mary jane watson')).toBe('MJ');
  });

  test('uses one letter for a single word', () => {
    expect(getInitials('Chinedu')).toBe('C');
  });

  test('ignores extra whitespace', () => {
    expect(getInitials('  grace   okafor  ')).toBe('GO');
  });
});
