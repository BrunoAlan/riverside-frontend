'use client';

import { useCallback, useState } from 'react';
import { ExcursionsPanel } from '@/components/panels/itinerary/excursions-panel';
import { type ItineraryTab, ItineraryTabs } from '@/components/panels/itinerary/itinerary-tabs';
import { PanelMap } from '@/components/panels/map/panel-map';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/shadcn/utils';

type ItineraryPanelProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');
  const setViewFromUser = useSetViewFromUser();
  const { itinerary, detailCityId, detailExperienceId } = view;

  // Switching to Excursions with a city detail open silently collapses it —
  // this is tab-switch cleanup, not a user action on the itinerary, so it
  // sends no agent intent (unlike CityDetailCard's own close button).
  const handleTabChange = useCallback(
    (tab: ItineraryTab) => {
      setActiveTab(tab);
      if (tab === 'excursions' && detailCityId) {
        setViewFromUser({ type: 'itinerary', itinerary });
      }
    },
    [detailCityId, itinerary, setViewFromUser]
  );

  return (
    <div className="absolute inset-0">
      <div
        className={cn('absolute inset-0', activeTab !== 'overview' && 'pointer-events-none')}
        inert={activeTab !== 'overview'}
      >
        <PanelMap view={view} interactive={activeTab === 'overview'} />
      </div>
      <div
        className={cn(
          'absolute inset-0',
          activeTab !== 'excursions' && 'pointer-events-none opacity-0'
        )}
        inert={activeTab !== 'excursions'}
      >
        <ExcursionsPanel itinerary={itinerary} detailExperienceId={detailExperienceId} />
      </div>
      <div className="absolute top-6 left-6 z-20">
        <ItineraryTabs value={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  );
}
