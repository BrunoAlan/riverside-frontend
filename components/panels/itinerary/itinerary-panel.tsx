'use client';

import { useState } from 'react';
import { ExcursionsPanel } from '@/components/panels/itinerary/excursions-panel';
import { type ItineraryTab, ItineraryTabs } from '@/components/panels/itinerary/itinerary-tabs';
import { PanelMap } from '@/components/panels/map/panel-map';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

type ItineraryPanelProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');

  return (
    <div className="absolute inset-0">
      <div className="absolute top-6 left-6 z-20">
        <ItineraryTabs value={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'overview' ? (
        <PanelMap view={view} />
      ) : (
        <ExcursionsPanel itinerary={view.itinerary} />
      )}
    </div>
  );
}
