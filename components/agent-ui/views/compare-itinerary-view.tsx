'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AgentHeader } from '@/components/agent-ui/agent-header';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

function resolveItinerary(optionId: string, fallbackIndex: number) {
  const match = itineraries.find((i) => i.id === optionId);
  if (!match) {
    console.warn(
      `[compare_itinerary] unknown option id "${optionId}", falling back to itineraries[${fallbackIndex}]`
    );
  }
  return match ?? itineraries[fallbackIndex];
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
  const left = first ? resolveItinerary(first.id, 0) : undefined;
  const right = second ? resolveItinerary(second.id, 1) : undefined;

  return (
    <div className="fixed inset-0 flex">
      {left && (
        <div className={`relative h-full ${right ? 'w-1/2' : 'w-full'}`}>
          <MapCanvas
            cities={left.cities}
            center={left.center}
            zoom={left.zoom}
            onCityExpand={handleCityExpand}
          />
        </div>
      )}
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
      {left && right && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
          <div className="h-full w-0.5 bg-green-700" />
          <div className="absolute top-0 left-1/2 w-32 -translate-x-1/2">
            <AgentHeader />
          </div>
        </div>
      )}
    </div>
  );
}
