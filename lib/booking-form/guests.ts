import type { BookingForm } from '@/lib/booking-form/types';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export type GuestInfo = {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
};

export function makeEmptyGuests(count: number): GuestInfo[] {
  return Array.from({ length: Math.max(0, count) }, () => ({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: 'US',
    phone: '',
  }));
}

/** The only codes the phone country select can render. */
export const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'ES'] as const;

export function makeBookingForm(summary: ItinerarySummary, guestCount: number): BookingForm {
  // Defensive cap — a malformed guest_count must not render thousands of blocks.
  const count = Math.min(Math.max(1, guestCount), 8);
  return {
    summary,
    guestCount: count,
    guests: makeEmptyGuests(count),
    agreed: false,
    status: 'editing',
  };
}
