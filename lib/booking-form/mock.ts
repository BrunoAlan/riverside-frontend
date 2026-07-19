import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
import { makeBookingForm } from './guests';
import type { BookingForm } from './types';

// Reuse the itinerary summary data verbatim — the checkout recap is the same
// destination / cabin / package the guest just configured.
export const BOOKING_FORM_MOCK: BookingForm = makeBookingForm(ITINERARY_SUMMARY_MOCK, 2);
