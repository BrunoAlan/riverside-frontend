import type { StyleSpecification } from 'maplibre-gl';

/**
 * Minimal OpenMapTiles-schema style for the Riverside parchment look.
 * Hex values mirror the --beige-* / --green-* CSS vars in styles/globals.css
 * (MapLibre style JSON cannot reference CSS variables).
 */
export const parchmentStyle: StyleSpecification = {
  version: 8,
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f3ede7' },
    },
    {
      id: 'landcover',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      paint: { 'fill-color': '#ede3da', 'fill-opacity': 0.55 },
    },
    {
      id: 'landuse',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      paint: { 'fill-color': '#e8ddd0', 'fill-opacity': 0.5 },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#cdd6cf' },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: { 'line-color': '#cdd6cf', 'line-width': 1.2 },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', ['get', 'admin_level'], 2],
      paint: {
        'line-color': '#b19a84',
        'line-width': 1,
        'line-dasharray': [3, 1.5],
      },
    },
  ],
};
