import { describe, expect, it } from 'vitest';
import { formatPackagePrice } from './packages';

describe('formatPackagePrice', () => {
  it('formats a EUR amount with the currency symbol and no decimals', () => {
    expect(formatPackagePrice(9174, 'EUR')).toBe('€9,174');
  });

  it('formats a sub-1,000 EUR amount without separators', () => {
    expect(formatPackagePrice(500, 'EUR')).toBe('€500');
  });

  it('suppresses decimals by rounding', () => {
    expect(formatPackagePrice(9174.4, 'EUR')).toBe('€9,174');
  });
});
