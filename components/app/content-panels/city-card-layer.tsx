'use client';

import { Fragment, useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { CityCard } from '@/components/app/content-panels/city-card';
import type { City } from '@/lib/map/cities';
import { type ProjectedCity, clusterCities } from '@/lib/map/cluster-cities';

// Cards are 220px wide; group when anchor screen distance is within this.
const CLUSTER_THRESHOLD = 120;
// Fixed diagonal offset between stacked cards in a cascade.
const OFFSET_X = 30;
const OFFSET_Y = 58;

type CityCardLayerProps = {
  map: maplibregl.Map;
  cities: City[];
  onCityExpand?: (city: City) => void;
};

export function CityCardLayer({ map, cities, onCityExpand }: CityCardLayerProps) {
  // Re-render on every map move so projected positions stay in sync.
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // move fires at up to 60fps; acceptable for small city counts (<~20).
    const onMove = () => forceUpdate((n) => n + 1);
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
    };
  }, [map]);

  const projected: ProjectedCity[] = cities.map((city) => {
    const p = map.project([city.lon, city.lat]);
    return { city, x: p.x, y: p.y };
  });
  const clusters = clusterCities(projected, CLUSTER_THRESHOLD);

  return (
    <>
      {clusters.map((cluster) => {
        // North-to-south: southernmost card ends up at the front (on top).
        const sorted = [...cluster].sort((a, b) => b.city.lat - a.city.lat);
        const front = sorted[sorted.length - 1];

        const clusterKey = sorted.map((pc) => pc.city.id).join('-');

        return (
          <Fragment key={clusterKey}>
            {sorted.map((pc, i) => {
              const fromBack = sorted.length - 1 - i; // 0 = front card
              const left = front.x - fromBack * OFFSET_X;
              const top = front.y - fromBack * OFFSET_Y;
              const isFront = i === sorted.length - 1;

              return (
                <div
                  key={pc.city.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                    isFront ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  style={{ left, top, zIndex: i }}
                >
                  <CityCard city={pc.city} interactive={isFront} onExpand={onCityExpand} />
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}
