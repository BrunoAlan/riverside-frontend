import { describe, expect, it } from 'vitest';
import { makeEmptyGuests } from './guests';

describe('makeEmptyGuests', () => {
  it('returns count blank guests', () => {
    const guests = makeEmptyGuests(2);
    expect(guests).toHaveLength(2);
    expect(guests[0]).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: 'US',
      phone: '',
    });
  });

  it('returns independent objects, not shared references', () => {
    const guests = makeEmptyGuests(2);
    guests[0].firstName = 'Ada';
    expect(guests[1].firstName).toBe('');
  });

  it('returns an empty array for 0 or negative counts', () => {
    expect(makeEmptyGuests(0)).toEqual([]);
    expect(makeEmptyGuests(-3)).toEqual([]);
  });
});
