'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
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

  const { itinerary, addOnDecisions, detailCityId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary, addOnDecisions]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary, addOnDecisions]);

  return (
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
      />
      {detailCity && <CityDetailCard city={detailCity} onClose={handleClose} />}
    </div>
  );
}
