'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

type PanelMapProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function PanelMap({ view }: PanelMapProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();

  const { itinerary, detailCityId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary]);

  return (
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
      />
      {detailCity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
          <CityDetailCard city={detailCity} onClose={handleClose} />
          {detailCity.experiences && detailCity.experiences.length > 0 && (
            <CityExperiencesPanel experiences={detailCity.experiences} />
          )}
        </div>
      )}
    </div>
  );
}
