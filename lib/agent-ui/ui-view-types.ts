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

export type PackageFeature = { id: string; label: string };

export type PackageOption = {
  id: string;
  name: string;
  price: number;
  currency: string;
  cells: Record<string, PackageCell>; // keyed by feature.id
};

export type ItineraryTab = 'overview' | 'excursions';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      // Which tab the itinerary view is showing. Undefined means 'overview'.
      // Lives here rather than in component state so ui-commands can drive it.
      activeTab?: ItineraryTab;
      detailCityId?: string;
      detailExperienceId?: string;
    }
  | { type: 'compare_itinerary'; options: ItineraryFull[] }
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string }
  | {
      type: 'package_selection';
      features: PackageFeature[];
      packages: PackageOption[];
    };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
