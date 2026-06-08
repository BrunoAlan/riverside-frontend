import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { buildRouteLegs, routeFeatureCollection } from './route-path';

const city = (id: string, days: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'X',
  image: '/x.png',
  days,
  lon,
  lat,
});

describe('buildRouteLegs', () => {
  it('returns no legs for an empty itinerary', () => {
    expect(buildRouteLegs([])).toEqual([]);
  });

  it('returns no legs for a single city', () => {
    expect(buildRouteLegs([city('only', 'Day 1', 0, 0)])).toEqual([]);
  });

  it('links cities in day order', () => {
    const legs = buildRouteLegs([
      city('a', 'Day 1', 0, 0),
      city('b', 'Day 2', 1, 0),
      city('c', 'Day 3', 2, 0),
    ]);
    expect(legs.map((l) => [l.fromId, l.toId])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
    expect(legs.every((l) => l.repeatIndex === 0)).toBe(true);
  });

  it('collapses consecutive days at the same city', () => {
    const legs = buildRouteLegs([city('a', 'Days 1 & 2', 0, 0), city('b', 'Day 3', 1, 0)]);
    expect(legs).toHaveLength(1);
    expect([legs[0].fromId, legs[0].toId]).toEqual(['a', 'b']);
  });

  it('produces a return leg on revisit, with a growing repeatIndex', () => {
    const legs = buildRouteLegs([city('a', 'Days 1 & 3', 0, 0), city('b', 'Day 2', 1, 0)]);
    expect(legs.map((l) => [l.fromId, l.toId, l.repeatIndex])).toEqual([
      ['a', 'b', 0],
      ['b', 'a', 1],
    ]);
  });

  it('reconstructs a real revisit pattern: the boat loops back to budapest', () => {
    // Budapest and Vienna each span days across the whole voyage, so the boat
    // sails out, returns to Budapest mid-trip, and sails the same corridors a
    // second time — the shipping "Danube Legends" shape. The Vienna→Budapest
    // return is a fresh corridor (repeatIndex 0); the second outbound pass repeats.
    const legs = buildRouteLegs([
      city('budapest', 'Days 1, 2, 6 & 7', 19.04, 47.5),
      city('bratislava', 'Days 3 & 8', 17.11, 48.15),
      city('vienna', 'Days 4, 5 & 9', 16.37, 48.21),
    ]);
    expect(legs.map((l) => [l.fromId, l.toId, l.repeatIndex])).toEqual([
      ['budapest', 'bratislava', 0],
      ['bratislava', 'vienna', 0],
      ['vienna', 'budapest', 0],
      ['budapest', 'bratislava', 1],
      ['bratislava', 'vienna', 1],
    ]);
  });

  it('orders cities that share a day by their position in the array', () => {
    const legs = buildRouteLegs([
      city('start', 'Day 1', 0, 0),
      city('tulln', 'Day 2', 1, 0),
      city('wachau', 'Day 2', 2, 0),
      city('end', 'Day 3', 3, 0),
    ]);
    expect(legs.map((l) => l.toId)).toEqual(['tulln', 'wachau', 'end']);
  });
});

describe('routeFeatureCollection', () => {
  it('builds one LineString feature per leg', () => {
    const fc = routeFeatureCollection([
      city('a', 'Day 1', 0, 0),
      city('b', 'Day 2', 2, 1),
      city('c', 'Day 3', 4, 0),
    ]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('LineString');
  });

  it('starts and ends each arc exactly on the leg endpoints', () => {
    const fc = routeFeatureCollection([city('a', 'Day 1', 0, 0), city('b', 'Day 2', 2, 1)]);
    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toEqual([0, 0]);
    expect(coords[coords.length - 1]).toEqual([2, 1]);
  });

  it('carries the leg repeatIndex onto the feature properties', () => {
    const fc = routeFeatureCollection([city('a', 'Days 1 & 3', 0, 0), city('b', 'Day 2', 2, 0)]);
    expect(fc.features.map((f) => f.properties.repeatIndex)).toEqual([0, 1]);
  });
});
