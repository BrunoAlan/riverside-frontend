import { describe, expect, it } from 'vitest';
import { formatPackagePrice } from './packages';

describe('formatPackagePrice', () => {
  it('formats a EUR amount with the currency symbol and no decimals', () => {
    expect(formatPackagePrice(9174, 'EUR')).toBe('€9,174');
  });

  it('formats another EUR amount', () => {
    expect(formatPackagePrice(8850, 'EUR')).toBe('€8,850');
  });
});
