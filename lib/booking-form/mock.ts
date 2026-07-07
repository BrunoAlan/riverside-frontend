import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
import type { BookingForm } from './types';

// Reuse the itinerary summary data verbatim — the checkout recap is the same
// destination / cabin / package the guest just configured.
export const BOOKING_FORM_MOCK: BookingForm = {
  summary: ITINERARY_SUMMARY_MOCK,
  guestCount: 2,
};
