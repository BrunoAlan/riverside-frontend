'use client';

import dynamic from 'next/dynamic';
import { AgentHeader } from '@/components/agent/agent-header';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function PanelMap() {
  const handleCityExpand = (city: City) => {
    // TODO: wire up expand behavior (e.g. open detail panel for `city`).
    console.log('expand city', city.id);
  };

  return (
    <div className="fixed inset-0">
      <MapCanvas onCityExpand={handleCityExpand} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <AgentHeader />
      </div>
    </div>
  );
}
