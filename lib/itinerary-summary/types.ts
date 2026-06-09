import type { Cabin } from '@/lib/agent-ui/commands';

export type SummaryItineraryCity = {
  id: string;
  name: string;
  country: string;
  days: string; // "Days 1, 2 & 8"
  image: string;
};

export type ItinerarySummaryDetails = {
  guests: string | null;
  month: string | null;
  embarkation: string | null;
  stops: string | null;
  dates: string | null;
  pricePerPerson: string | null;
  cabinName: string | null;
};

export type ItinerarySummaryPackage = {
  pricePerPerson: string | null;
  name: string | null;
  inclusions: string[];
};

export type ItinerarySummaryItinerary = {
  title: string | null;
  countries: string[];
  description: string | null;
  cities: SummaryItineraryCity[];
};

export type ItinerarySummary = {
  header: { title: string | null; subtitle: string | null; image: string | null };
  details: ItinerarySummaryDetails;
  cabin: Cabin | null;
  package: ItinerarySummaryPackage | null;
  itinerary: ItinerarySummaryItinerary | null;
  total: string | null;
};
