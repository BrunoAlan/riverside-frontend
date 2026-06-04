import type { Cabin } from '@/lib/agent-ui/commands';

export type SummaryItineraryCity = {
  id: string;
  name: string;
  country: string;
  days: string; // "Days 1, 2 & 8"
  image: string;
};

export type ItinerarySummaryDetails = {
  guests: string; // "2 people"
  month: string; // "September"
  embarkation: string; // "Vienna"
  stops: string; // "Budapest +3"
  dates: string; // "20 – 27 Sep 2026"
  pricePerPerson: string; // "€ 9,174 p.p."
  dietary: string; // "Dietary Accommodation"
  cabinName: string; // "Owner's Suite"
};

export type ItinerarySummaryPackage = {
  pricePerPerson: string; // "€ 9,174 p.p."
  name: string; // "Premium All Inclusive Including Excursions"
  inclusions: string[];
};

export type ItinerarySummary = {
  header: { title: string; subtitle: string; image: string };
  details: ItinerarySummaryDetails;
  cabin: Cabin;
  package: ItinerarySummaryPackage;
  itinerary: {
    title: string; // "Vienna – Vienna"
    countries: string[]; // ["Austria", "Hungary", "Slovakia"]
    description: string;
    cities: SummaryItineraryCity[];
  };
  total: string; // "€ 27,240"
};
