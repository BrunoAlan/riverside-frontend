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

// Index of the Danube vertex nearest a city, by squared planar distance. Used to
// clip the polyline by path position rather than longitude: at the Danube Bend
// the river turns south, so its longitude is no longer monotonic and a lon-based
// clip would drop the southward descent into Budapest.
function nearestVertexIndex(city: City): number {
  let best = 0;
  let bestDist = Infinity;
  DANUBE_COORDINATES.forEach(([lon, lat], i) => {
    const dLon = lon - city.lon;
    const dLat = lat - city.lat;
    const dist = dLon * dLon + dLat * dLat;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

// One LineString tracing the Danube between the westernmost and easternmost
// cities. The river vertices between the two cities' nearest points on the
// polyline form the body; the end cities anchor the visible line so it reaches
// each marker. Fewer than two cities can't form a line, so the collection comes
// back empty.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  if (cities.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const west = cities.reduce((a, b) => (b.lon < a.lon ? b : a));
  const east = cities.reduce((a, b) => (b.lon > a.lon ? b : a));

  // Clip by path index between each city's nearest river vertex (DANUBE_COORDINATES
  // runs west-to-east, so west maps to the lower index). Slice excludes the anchor
  // vertices themselves to avoid doubling back over the city coordinates.
  const start = nearestVertexIndex(west);
  const end = nearestVertexIndex(east);
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  const body = DANUBE_COORDINATES.slice(lo + 1, hi);
  const coordinates: [number, number][] = [[west.lon, west.lat], ...body, [east.lon, east.lat]];

  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }],
  };
}
