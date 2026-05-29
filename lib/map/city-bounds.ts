import type { City } from './cities';

/**
 * Axis-aligned lon/lat box covering every city, as
 * `[[minLon, minLat], [maxLon, maxLat]]` — the shape MapLibre's `fitBounds`
 * accepts. Returns `null` for an empty list so callers can fall back to an
 * explicit camera. A single city yields a zero-area box centered on it.
 */
export function cityBounds(cities: City[]): [[number, number], [number, number]] | null {
  if (cities.length === 0) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const { lon, lat } of cities) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
