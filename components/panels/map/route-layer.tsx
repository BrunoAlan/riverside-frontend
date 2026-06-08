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
const ARROW_LAYER_ID = 'route-arrows';
const ARROW_IMAGE_ID = 'route-arrow';

type RouteLayerProps = {
  map: maplibregl.Map;
  cities: City[];
};

/**
 * Draws the boat's voyage as curved arcs (one per leg) with a direction arrow at
 * each arc's center. Mirrors CityCardLayer: it manages its MapLibre source and
 * layers imperatively and renders no DOM of its own. map-canvas only mounts it
 * after the map's style has loaded, so addSource/addLayer are safe immediately.
 */
export function RouteLayer({ map, cities }: RouteLayerProps) {
  useEffect(() => {
    const data = routeFeatureCollection(cities);
    ensureArrowImage(map);

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 2.5, 'line-opacity': 0.7 },
      });
      map.addLayer({
        id: ARROW_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'symbol-placement': 'line-center',
          'icon-image': ARROW_IMAGE_ID,
          'icon-size': 0.5,
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
    }

    return () => {
      if (map.getLayer(ARROW_LAYER_ID)) map.removeLayer(ARROW_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, cities]);

  return null;
}

// Bake a small green triangle (pointing +x) into the map's sprite once. With
// `symbol-placement: line-center` MapLibre rotates it to the leg's bearing, so
// it points the way the boat travels (legs run from→to).
function ensureArrowImage(map: maplibregl.Map) {
  if (map.hasImage(ARROW_IMAGE_ID)) return;
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = ROUTE_COLOR;
  ctx.beginPath();
  ctx.moveTo(3, 3);
  ctx.lineTo(size - 3, size / 2);
  ctx.lineTo(3, size - 3);
  ctx.closePath();
  ctx.fill();
  const { width, height, data } = ctx.getImageData(0, 0, size, size);
  map.addImage(ARROW_IMAGE_ID, { width, height, data });
}
