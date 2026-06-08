import type { City } from '@/lib/map/cities';

// The voyage drawn as a single straight line through the cities in the order
// they're listed. Structurally a GeoJSON FeatureCollection with one LineString,
// kept as a local type so this module needs no extra dependency; it is
// assignable to the GeoJSON.FeatureCollection MapLibre's addSource/setData take.
export type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties: Record<string, never>;
  }[];
};

// One LineString connecting every city in array order. Fewer than two cities
// can't form a line, so the collection comes back empty.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  if (cities.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }
  const coordinates = cities.map((c): [number, number] => [c.lon, c.lat]);
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }],
  };
}
