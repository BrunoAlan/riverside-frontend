import type { ItineraryOption } from './commands';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage' }
  | { type: 'itinerary' }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection' };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';
