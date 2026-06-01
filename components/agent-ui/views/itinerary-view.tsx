'use client';

import { PanelMap } from '@/components/panels/map/panel-map';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function ItineraryView({ view }: { view: Extract<UiView, { type: 'itinerary' }> }) {
  return <PanelMap view={view} />;
}
