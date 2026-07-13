'use client';

import { ItineraryPanel } from '@/components/panels/itinerary/itinerary-panel';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function ItineraryView({ view }: { view: Extract<UiView, { type: 'itinerary' }> }) {
  return <ItineraryPanel view={view} />;
}
