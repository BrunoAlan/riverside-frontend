import { describe, expect, it } from 'vitest';
import { formatDayBadge } from './format-day-badge';

describe('formatDayBadge', () => {
  it('renders a single day in the singular', () => {
    expect(formatDayBadge(['Day 1'])).toBe('Day 1');
  });

  it('joins exactly two days with an ampersand', () => {
    expect(formatDayBadge(['Day 1', 'Day 3'])).toBe('Days 1 & 3');
  });

  it('truncates three or more days to the first two plus a remainder count', () => {
    expect(formatDayBadge(['Day 1', 'Day 2', 'Day 6', 'Day 7'])).toBe('Days 1, 2 +2');
  });

  it('returns an empty string for no days', () => {
    expect(formatDayBadge([])).toBe('');
  });

  it('falls back to the raw labels when they carry no day numbers', () => {
    expect(formatDayBadge(['At sea'])).toBe('At sea');
  });
});
