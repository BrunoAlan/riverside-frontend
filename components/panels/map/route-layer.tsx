'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { City } from '@/lib/map/cities';
import { routeFeatureCollection } from '@/lib/map/route-path';

// green-700 (styles/globals.css). MapLibre paint needs a hex literal — same as
// the parchment style's palette — so it lives beside the layer that uses it.
const ROUTE_COLOR = '#39473c';

const SOURCE_ID = 'route';
const LINE_LAYER_ID = 'route-line';

type RouteLayerProps = {
  map: maplibregl.Map;
  cities: City[];
};

/**
 * Draws the voyage as a single line connecting the cities in order. Mirrors
 * CityCardLayer: it manages its MapLibre source and layer imperatively and
 * renders no DOM of its own. map-canvas only mounts it after the map's style has
 * loaded, so addSource/addLayer are safe immediately.
 */
export function RouteLayer({ map, cities }: RouteLayerProps) {
  // Set up the source + layer once per map instance and tear them down on
  // unmount. Keeping this off the `cities` dep means a changing itinerary
  // updates the data (effect below) instead of flashing the layer away and back.
  useEffect(() => {
    // Idempotent: under dev Fast Refresh the effect can re-run on a map that
    // already has our source/layer, so clear them first.
    if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    map.addSource(SOURCE_ID, { type: 'geojson', data: routeFeatureCollection(cities) });
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOR, 'line-width': 2.5, 'line-opacity': 0.7 },
    });

    return () => {
      // The map may already be torn down (e.g. Fast Refresh removed it before
      // this runs), which makes getLayer/removeLayer throw on a gone style.
      // RouteLayer doesn't own the map's lifecycle, so guard against that.
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map already removed; its source/layer went with it.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per map; data syncs below
  }, [map]);

  // Keep the line in sync when the itinerary's cities change, without rebuilding
  // the layer.
  useEffect(() => {
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(routeFeatureCollection(cities));
  }, [map, cities]);

  return null;
}
