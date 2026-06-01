import { describe, expect, it } from 'vitest';
import { formatCabinPrice } from './cabins';

describe('formatCabinPrice', () => {
  it('formats with thousands separators', () => {
    expect(formatCabinPrice(12229)).toBe('12,229');
  });

  it('formats values under 1000 without separators', () => {
    expect(formatCabinPrice(850)).toBe('850');
  });
});
