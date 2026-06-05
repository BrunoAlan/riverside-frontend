import type {
  BookingSummarySnapshot,
  Cabin,
  Destination,
  DestinationImage,
  ItineraryFull,
} from './commands';

export type PackageCell =
  | { kind: 'included' }
  | { kind: 'excluded' }
  | { kind: 'text'; text: string };

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  cells: Record<string, PackageCell>; // keyed by feature.id
}

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      detailCityId?: string;
      detailExperienceId?: string;
    }
  | { type: 'compare_itinerary'; options: ItineraryFull[] }
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string }
  | {
      type: 'package_selection';
      features: { id: string; label: string }[];
      packages: PackageOption[];
    };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
