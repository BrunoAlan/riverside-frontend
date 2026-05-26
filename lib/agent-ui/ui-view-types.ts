import type { BookingSummarySnapshot, DreamImage, ItineraryOption } from './commands';

export type AddOnDecision = 'confirmed' | 'rejected';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; images: DreamImage[] }
  | { type: 'itinerary'; addOnDecisions: Record<string, AddOnDecision> }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection'; detailCabinId?: string };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
