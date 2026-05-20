'use client';

import { useEffect, useRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { CITY_CARD_WIDTH, CityCard } from '@/components/app/content-panels/city-card';
import type { City } from '@/lib/map/cities';
import { type ProjectedCity, clusterCities } from '@/lib/map/cluster-cities';

// Group cities whose anchors fall within a card-width-minus-margin of each
// other, so cards that would visibly overlap end up in the same cascade.
const CLUSTER_THRESHOLD = CITY_CARD_WIDTH - 100;
// Fixed diagonal offset between stacked cards in a cascade.
const OFFSET_X = 30;
const OFFSET_Y = 58;

type CityCardLayerProps = {
  map: maplibregl.Map;
  cities: City[];
  onCityExpand?: (city: City) => void;
};

/**
 * Renders one MapLibre Marker per cluster of cities. MapLibre keeps each marker
 * locked to the map synchronously on every frame, so cards never lag behind a
 * pan — and because markers live inside the map container they are clipped to
 * it. Cluster membership depends only on zoom (panning translates every city
 * uniformly), so clustering is recomputed on `zoom`, never on `move`.
 */
export function CityCardLayer({ map, cities, onCityExpand }: CityCardLayerProps) {
  // Keep onCityExpand in a ref so unstable callers don't tear down all markers
  // on every render.
  const onCityExpandRef = useRef(onCityExpand);
  useEffect(() => {
    onCityExpandRef.current = onCityExpand;
  }, [onCityExpand]);

  useEffect(() => {
    type Entry = { key: string; marker: maplibregl.Marker; root: Root };
    let entries: Entry[] = [];

    // Project every city to screen pixels, group nearby ones, and sort each
    // cluster north-to-south so the southernmost city is the interactive front.
    const buildClusters = (): ProjectedCity[][] => {
      const projected: ProjectedCity[] = cities.map((city) => {
        const p = map.project([city.lon, city.lat]);
        return { city, x: p.x, y: p.y };
      });
      return clusterCities(projected, CLUSTER_THRESHOLD).map((group) =>
        [...group].sort((a, b) => b.city.lat - a.city.lat)
      );
    };

    const syncMarkers = () => {
      const clusters = buildClusters();
      const nextKeys = clusters.map((g) => g.map((pc) => pc.city.id).join('-'));

      // Clusters only change on zoom. If the set is unchanged the existing
      // markers already track the map on their own — nothing to rebuild.
      const unchanged =
        entries.length === nextKeys.length && entries.every((e, i) => e.key === nextKeys[i]);
      if (unchanged && entries.length > 0) return;

      entries.forEach((e) => {
        e.root.unmount();
        e.marker.remove();
      });

      entries = clusters.map((sorted, i) => {
        const front = sorted[sorted.length - 1].city;
        const el = document.createElement('div');
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([front.lon, front.lat])
          .addTo(map);
        const root = createRoot(el);
        root.render(
          <Cascade sorted={sorted} onCityExpand={(city) => onCityExpandRef.current?.(city)} />
        );
        return { key: nextKeys[i], marker, root };
      });
    };

    syncMarkers();
    map.on('zoom', syncMarkers);

    return () => {
      map.off('zoom', syncMarkers);
      entries.forEach((e) => {
        e.root.unmount();
        e.marker.remove();
      });
    };
  }, [map, cities]);

  return null;
}

type CascadeProps = {
  sorted: ProjectedCity[];
  onCityExpand?: (city: City) => void;
};

/**
 * The stacked cascade rendered inside a single cluster marker. The front
 * (southernmost) card sits at the marker anchor; the rest trail up-left with a
 * fixed diagonal offset and are non-interactive.
 */
function Cascade({ sorted, onCityExpand }: CascadeProps) {
  return (
    <>
      {sorted.map((pc, i) => {
        const fromBack = sorted.length - 1 - i; // 0 = front card
        const isFront = i === sorted.length - 1;
        return (
          <div
            key={pc.city.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${
              isFront ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ left: -fromBack * OFFSET_X, top: -fromBack * OFFSET_Y, zIndex: i }}
          >
            <CityCard city={pc.city} interactive={isFront} onExpand={onCityExpand} />
          </div>
        );
      })}
    </>
  );
}
