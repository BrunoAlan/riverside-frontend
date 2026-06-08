import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { DANUBE_COORDINATES } from './danube-path';
import { routeFeatureCollection } from './route-path';

const city = (id: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'Austria',
  image: '',
  days: '',
  lon,
  lat,
});

// The three itinerary cities, intentionally out of west-to-east order.
const wachau = city('wachau', 15.4214, 48.3797);
const vienna = city('vienna', 16.3738, 48.2082);
const bratislava = city('bratislava', 17.1077, 48.1486);

describe('routeFeatureCollection', () => {
  it('returns an empty collection for fewer than two cities', () => {
    expect(routeFeatureCollection([vienna]).features).toHaveLength(0);
    expect(routeFeatureCollection([]).features).toHaveLength(0);
  });

  it('traces the river: many points, not one vertex per city', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    expect(fc.features).toHaveLength(1);
    const coords = fc.features[0].geometry.coordinates;
    // Far more than the 3 city vertices a straight route would produce.
    expect(coords.length).toBeGreaterThan(10);
  });

  it('anchors the ends to the westernmost and easternmost cities', () => {
    const fc = routeFeatureCollection([vienna, bratislava, wachau]);
    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toEqual([wachau.lon, wachau.lat]);
    expect(coords[coords.length - 1]).toEqual([bratislava.lon, bratislava.lat]);
  });

  it('keeps every coordinate within the cities longitude span', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    const coords = fc.features[0].geometry.coordinates;
    for (const [lon] of coords) {
      expect(lon).toBeGreaterThanOrEqual(wachau.lon);
      expect(lon).toBeLessThanOrEqual(bratislava.lon);
    }
  });

  it('only includes river points between the city longitudes', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    const coords = fc.features[0].geometry.coordinates;
    const interior = coords.slice(1, -1);
    // Every interior point is an actual Danube vertex within the span.
    for (const p of interior) {
      expect(DANUBE_COORDINATES.some(([lo, la]) => lo === p[0] && la === p[1])).toBe(true);
    }
  });
});
