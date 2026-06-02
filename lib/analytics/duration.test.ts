import { describe, expect, it } from 'vitest';
import { computeDurationSeconds } from './duration';

describe('computeDurationSeconds', () => {
  it('rounds milliseconds to whole seconds', () => {
    expect(computeDurationSeconds(1_000, 6_400)).toBe(5);
  });

  it('returns 0 for equal timestamps', () => {
    expect(computeDurationSeconds(5_000, 5_000)).toBe(0);
  });

  it('never returns negative when end precedes start', () => {
    expect(computeDurationSeconds(10_000, 5_000)).toBe(0);
  });
});
