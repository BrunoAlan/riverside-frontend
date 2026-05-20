import type { BookingSummarySnapshot, DreamImage, ItineraryOption } from './commands';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; images: DreamImage[] }
  | { type: 'itinerary' }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection' };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
