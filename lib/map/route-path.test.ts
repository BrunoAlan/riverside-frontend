import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { routeFeatureCollection } from './route-path';

const city = (id: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'X',
  image: '/x.png',
  days: 'Day 1',
  lon,
  lat,
});

describe('routeFeatureCollection', () => {
  it('returns no line for an empty itinerary', () => {
    expect(routeFeatureCollection([]).features).toEqual([]);
  });

  it('returns no line for a single city (nothing to connect)', () => {
    expect(routeFeatureCollection([city('only', 0, 0)]).features).toEqual([]);
  });

  it('connects the cities west-to-east by longitude with one LineString', () => {
    const fc = routeFeatureCollection([city('east', 3, 0), city('west', 0, 1), city('mid', 1, 2)]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.type).toBe('LineString');
    expect(fc.features[0].geometry.coordinates).toEqual([
      [0, 1], // west
      [1, 2], // mid
      [3, 0], // east
    ]);
  });

  it('does not mutate the input array', () => {
    const cities = [city('east', 3, 0), city('west', 0, 1)];
    routeFeatureCollection(cities);
    expect(cities.map((c) => c.id)).toEqual(['east', 'west']);
  });
});
