import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { buildRouteLegs } from './route-path';

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
