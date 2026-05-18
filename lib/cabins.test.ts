import { describe, expect, it } from 'vitest';
import { cabins, formatCabinPrice } from './cabins';

describe('formatCabinPrice', () => {
  it('formats with thousands separators', () => {
    expect(formatCabinPrice(12229)).toBe('12,229');
  });

  it('formats values under 1000 without separators', () => {
    expect(formatCabinPrice(850)).toBe('850');
  });
});

describe('cabins', () => {
  it('contains the 6 suites', () => {
    expect(cabins).toHaveLength(6);
  });

  it('every cabin has a unique id', () => {
    const ids = cabins.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
