import type { City } from '@/lib/map/cities';
import { parseDayNumbers } from '@/lib/map/parse-city-days';

// One hop of the voyage, from one stop to the next in day order. `repeatIndex`
// counts how many earlier legs already ran along the same undirected corridor,
// so the geometry can fan repeated passes out instead of stacking them.
export type RouteLeg = {
  from: [number, number]; // [lon, lat]
  to: [number, number];
  fromId: string;
  toId: string;
  repeatIndex: number;
};

type Visit = { day: number; cityIndex: number; id: string; lon: number; lat: number };

// Rebuild the ordered voyage from the cities' free-text `days`. A city can
// appear on several days (and several cities can share a day), so we expand to
// one occurrence per day, sort by day — breaking ties by the city's position in
// the array, which already runs along the river — drop consecutive repeats of
// the same city, and connect what's left.
export function buildRouteLegs(cities: City[]): RouteLeg[] {
  const occurrences: Visit[] = [];
  cities.forEach((city, cityIndex) => {
    const days = parseDayNumbers(city.days);
    // No parseable day → fall back to array position so it still orders sanely.
    const effectiveDays = days.length > 0 ? days : [cityIndex];
    for (const day of effectiveDays) {
      occurrences.push({ day, cityIndex, id: city.id, lon: city.lon, lat: city.lat });
    }
  });

  occurrences.sort((a, b) => a.day - b.day || a.cityIndex - b.cityIndex);

  const visits: Visit[] = [];
  for (const occ of occurrences) {
    const prev = visits[visits.length - 1];
    if (prev && prev.id === occ.id) continue; // same city two days running = one stop
    visits.push(occ);
  }

  const corridorCount = new Map<string, number>();
  const legs: RouteLeg[] = [];
  for (let i = 0; i < visits.length - 1; i++) {
    const a = visits[i];
    const b = visits[i + 1];
    const key = [a.id, b.id].sort().join('—'); // undirected: A→B and B→A share a corridor
    const repeatIndex = corridorCount.get(key) ?? 0;
    corridorCount.set(key, repeatIndex + 1);
    legs.push({
      from: [a.lon, a.lat],
      to: [b.lon, b.lat],
      fromId: a.id,
      toId: b.id,
      repeatIndex,
    });
  }
  return legs;
}

// --- arc geometry -----------------------------------------------------------

// A leg drawn as a curved line. Structurally a GeoJSON LineString Feature, kept
// as a local type so this module needs no extra dependency; it is assignable to
// the GeoJSON.FeatureCollection that MapLibre's addSource/setData expect.
export type RouteLineFeature = {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: { repeatIndex: number };
};

export type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: RouteLineFeature[];
};

// Points sampled along each Bézier arc.
const ARC_SAMPLES = 28;
// Bow of a single arc, as a fraction of the leg's straight length…
const BASE_OFFSET_RATIO = 0.18;
// …clamped (degrees) so short legs still curve and the long return leg doesn't balloon.
const MIN_OFFSET = 0.04;
const MAX_OFFSET = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Quadratic Bézier from `from` to `to`, bowed sideways. Repeated corridors
// alternate sides and grow with each pass, so the boat's two trips along the
// same stretch sit side by side instead of on top of each other.
function legToFeature(leg: RouteLeg): RouteLineFeature {
  const [x1, y1] = leg.from;
  const [x2, y2] = leg.to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  // Unit vector perpendicular to the straight chord.
  const px = length === 0 ? 0 : -dy / length;
  const py = length === 0 ? 0 : dx / length;

  const side = leg.repeatIndex % 2 === 0 ? 1 : -1;
  const step = Math.floor(leg.repeatIndex / 2) + 1;
  const offset = clamp(length * BASE_OFFSET_RATIO, MIN_OFFSET, MAX_OFFSET) * side * step;

  // Control point: chord midpoint pushed out along the perpendicular.
  const cx = (x1 + x2) / 2 + px * offset;
  const cy = (y1 + y2) / 2 + py * offset;

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = i / ARC_SAMPLES;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    coordinates.push([x, y]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: { repeatIndex: leg.repeatIndex },
  };
}

// Full route as GeoJSON, ready to hand to a MapLibre geojson source.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: buildRouteLegs(cities).map(legToFeature),
  };
}
