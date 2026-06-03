import type {
  BookingSummarySnapshot,
  Cabin,
  Destination,
  DestinationImage,
  ItineraryFull,
} from './commands';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      detailCityId?: string;
    }
  | { type: 'compare_itinerary'; options: ItineraryFull[] }
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
