import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { type ProjectedCity, clusterCities } from './cluster-cities';

function makeCity(id: string): City {
  return {
    id,
    name: id,
    country: 'Test',
    image: '/test.png',
    days: 'Day 1',
    lon: 0,
    lat: 0,
  };
}

function pt(id: string, x: number, y: number): ProjectedCity {
  return { city: makeCity(id), x, y };
}

describe('clusterCities', () => {
  it('puts each city in its own group when none are close', () => {
    const result = clusterCities([pt('a', 0, 0), pt('b', 500, 500)], 120);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.length === 1)).toBe(true);
  });

  it('groups two cities within the threshold', () => {
    const result = clusterCities([pt('a', 0, 0), pt('b', 50, 50)], 120);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });

  it('groups a transitive chain of three (A~B, B~C, A not near C)', () => {
    const result = clusterCities([pt('a', 0, 0), pt('b', 100, 0), pt('c', 200, 0)], 120);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it('keeps two separate pairs as two groups', () => {
    const result = clusterCities(
      [pt('a', 0, 0), pt('b', 40, 0), pt('c', 800, 0), pt('d', 840, 0)],
      120
    );
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.length === 2)).toBe(true);
  });

  it('returns an empty array for no input', () => {
    expect(clusterCities([], 120)).toEqual([]);
  });
});
