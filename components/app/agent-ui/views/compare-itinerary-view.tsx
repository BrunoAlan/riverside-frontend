'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="bg-beige-200 h-full w-full" /> }
);

function resolveItinerary(optionId: string) {
  const match = itineraries.find((i) => i.id === optionId);
  if (!match) {
    console.warn(`[compare_itinerary] unknown option id "${optionId}"`);
  }
  return match;
}

export function CompareItineraryView({
  view,
}: {
  view: Extract<UiView, { type: 'compare_itinerary' }>;
}) {
  const handleCityExpand = useCallback((city: City) => {
    console.log('expand city', city.id);
  }, []);

  const [first, second] = view.options;
  const left = first ? resolveItinerary(first.id) : undefined;
  const right = second ? resolveItinerary(second.id) : undefined;

  return (
    <div className="fixed inset-0 flex">
      <div className={`relative h-full ${right ? 'w-1/2' : 'w-full'}`}>
        {left && (
          <MapCanvas
            cities={left.cities}
            center={left.center}
            zoom={left.zoom}
            onCityExpand={handleCityExpand}
          />
        )}
      </div>
      {right && (
        <div className="relative h-full w-1/2">
          <MapCanvas
            cities={right.cities}
            center={right.center}
            zoom={right.zoom}
            onCityExpand={handleCityExpand}
          />
        </div>
      )}
    </div>
  );
}
