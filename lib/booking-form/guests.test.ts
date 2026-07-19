import { describe, expect, it } from 'vitest';
import { makeBookingForm, makeEmptyGuests } from './guests';

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

describe('makeBookingForm', () => {
  it('seeds an editing form with empty guests', () => {
    const summary = {} as import('@/lib/itinerary-summary/types').ItinerarySummary;
    const form = makeBookingForm(summary, 2);
    expect(form.guestCount).toBe(2);
    expect(form.guests).toHaveLength(2);
    expect(form.guests[0]).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: 'US',
      phone: '',
    });
    expect(form.agreed).toBe(false);
    expect(form.status).toBe('editing');
  });

  it('clamps guest_count to at least 1', () => {
    const summary = {} as import('@/lib/itinerary-summary/types').ItinerarySummary;
    expect(makeBookingForm(summary, 0).guests).toHaveLength(1);
    expect(makeBookingForm(summary, -3).guestCount).toBe(1);
  });
});
