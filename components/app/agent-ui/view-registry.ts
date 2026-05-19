import type { ComponentType } from 'react';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { DiscoveryCanvasView } from './views/discovery-canvas-view';
import { ItineraryOptionsView } from './views/itinerary-options-view';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};

export const VIEW_REGISTRY: ViewRegistry = {
  discovery_canvas: DiscoveryCanvasView,
  itinerary_options: ItineraryOptionsView,
};
