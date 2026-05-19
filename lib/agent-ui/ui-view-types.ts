import type { ItineraryOption } from './commands';

export type UiView =
  | { type: 'discovery_canvas' }
  | { type: 'itinerary_options'; options: ItineraryOption[] };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev';
