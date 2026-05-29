'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function CompareItineraryView({
  view,
}: {
  view: Extract<UiView, { type: 'compare_itinerary' }>;
}) {
  const handleCityExpand = useCallback((city: City) => {
    console.log('expand city', city.id);
  }, []);

  const [left, right] = view.options;

  return (
    <div className="absolute inset-0 flex">
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
        </div>
      )}
    </div>
  );
}
