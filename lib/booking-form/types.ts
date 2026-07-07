import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

// The booking form reuses the itinerary data verbatim; the only booking-specific
// field is how many guest blocks to render.
export type BookingForm = {
  summary: ItinerarySummary;
  guestCount: number;
};
