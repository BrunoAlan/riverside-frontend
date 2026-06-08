import type { City } from '@/lib/map/cities';
import { DANUBE_COORDINATES } from '@/lib/map/danube-path';

// The voyage drawn as a single line that follows the Danube's course between the
// itinerary cities. Structurally a GeoJSON FeatureCollection with one LineString,
// kept as a local type so this module needs no extra dependency; it is assignable
// to the GeoJSON.FeatureCollection MapLibre's addSource/setData take.
export type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties: Record<string, never>;
  }[];
};

// One LineString tracing the Danube between the westernmost and easternmost
// cities. The river points within the cities' longitude span form the body; the
// span's end cities anchor the visible line so it reaches each marker. Fewer than
// two cities can't form a line, so the collection comes back empty.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  if (cities.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const west = cities.reduce((a, b) => (b.lon < a.lon ? b : a));
  const east = cities.reduce((a, b) => (b.lon > a.lon ? b : a));

  const body = DANUBE_COORDINATES.filter(([lon]) => lon > west.lon && lon < east.lon);
  const coordinates: [number, number][] = [[west.lon, west.lat], ...body, [east.lon, east.lat]];

  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }],
  };
}
