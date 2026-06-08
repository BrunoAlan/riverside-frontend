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

  it('connects every city in order with one straight LineString', () => {
    const fc = routeFeatureCollection([city('a', 0, 0), city('b', 1, 2), city('c', 3, 4)]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.type).toBe('LineString');
    expect(fc.features[0].geometry.coordinates).toEqual([
      [0, 0],
      [1, 2],
      [3, 4],
    ]);
  });
});
