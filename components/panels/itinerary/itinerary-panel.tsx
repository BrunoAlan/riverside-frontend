'use client';

import { useCallback } from 'react';
import { ExcursionsPanel } from '@/components/panels/itinerary/excursions-panel';
import { type ItineraryTab, ItineraryTabs } from '@/components/panels/itinerary/itinerary-tabs';
import { PanelMap } from '@/components/panels/map/panel-map';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import { useSetItineraryTabFromUser, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/shadcn/utils';

type ItineraryPanelProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const setItineraryTab = useSetItineraryTabFromUser();
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const { itinerary, detailCityId, detailExperienceId } = view;
  const activeTab = view.activeTab ?? 'overview';

  // Switching to Excursions with a city detail open silently collapses it —
  // this is tab-switch cleanup, not a user action on the itinerary, so it
  // sends no explore/close intent of its own.
  //
  // The intent below is edge-triggered here, on a real user tab change. It must
  // never move to an effect on `activeTab`: an agent-driven switch would echo
  // back, and every intent occupies one of the backend's three
  // conversation-history slots.
  const handleTabChange = useCallback(
    (tab: ItineraryTab) => {
      if (tab === activeTab) return;
      if (tab === 'excursions' && detailCityId) {
        // Full-view replace, so every field we mean to keep is named. The open
        // experience detail carries over deliberately — the user was reading it
        // on the map and the grid can show the same one.
        setViewFromUser({
          type: 'itinerary',
          itinerary,
          activeTab: 'excursions',
          detailExperienceId,
        });
      } else {
        setItineraryTab(tab);
      }
      // `view_itinerary` is also what PanelMap sends when the user closes a city
      // card, so the payload matches that one — both mean "the user is looking at
      // the itinerary again", and the backend should treat them the same.
      void sendIntent(tab === 'excursions' ? 'view_excursions' : 'view_itinerary', {
        entities: { itinerary_name: itinerary?.name },
        userMessage:
          tab === 'excursions'
            ? 'User switched to the excursions tab'
            : 'User returned to the itinerary tab',
      });
    },
    [
      activeTab,
      detailCityId,
      detailExperienceId,
      itinerary,
      setItineraryTab,
      setViewFromUser,
      sendIntent,
    ]
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
