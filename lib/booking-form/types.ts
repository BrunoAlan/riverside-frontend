import type { GuestInfo } from '@/lib/booking-form/guests';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

// The booking form reuses the itinerary data verbatim. Guest data and consent
// live here (not in component state) so ui-commands can write them.
export type BookingForm = {
  summary: ItinerarySummary;
  guestCount: number;
  guests: GuestInfo[];
  // Consent is only ever set by a user tap — no command touches it.
  agreed: boolean;
  // 'submitting' = snapshot sent via submit_booking_form; resolved by the
  // close_booking_form command (the X stays usable as an escape hatch).
  status: 'editing' | 'submitting';
};
