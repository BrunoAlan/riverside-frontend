'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

type PanelMapProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
};

export function PanelMap({ cities, center, zoom }: PanelMapProps = {}) {
  const handleCityExpand = useCallback((city: City) => {
    // TODO: wire up expand behavior (e.g. open detail panel for `city`).
    console.log('expand city', city.id);
  }, []);

  return (
    <div className="absolute inset-0">
      <MapCanvas cities={cities} center={center} zoom={zoom} onCityExpand={handleCityExpand} />
    </div>
  );
}
