'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function CompareItinerary() {
  const handleCityExpand = useCallback((city: City) => {
    // TODO: wire up expand behavior (e.g. open detail panel for `city`).
    console.log('expand city', city.id);
  }, []);

  const [left, right] = itineraries;

  return (
    <div className="fixed inset-0 flex">
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={left.cities}
          center={left.center}
          zoom={left.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={right.cities}
          center={right.center}
          zoom={right.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>

      {/* Central divider */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
        <div className="h-full w-1 bg-green-700" />
        <div className="absolute top-0 left-1/2 flex w-32 -translate-x-1/2 justify-center">
          <Image
            src="/riverside-logo.svg"
            alt="Riverside Luxury Cruises"
            width={105}
            height={128}
            priority
            className="h-[90px] w-auto rounded-b-md"
          />
        </div>
      </div>
    </div>
  );
}
