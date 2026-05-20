import type { ComponentType } from 'react';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { CabinSelectionView } from './views/cabin-selection-view';
import { CompareItineraryView } from './views/compare-itinerary-view';
import { DreamStageView } from './views/dream-stage-view';
import { ItineraryView } from './views/itinerary-view';
import { PresentationView } from './views/presentation-view';
import { StartView } from './views/start-view';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};

export const VIEW_REGISTRY: ViewRegistry = {
  start: StartView,
  presentation: PresentationView,
  dream_stage: DreamStageView,
  itinerary: ItineraryView,
  compare_itinerary: CompareItineraryView,
  cabin_selection: CabinSelectionView,
};
