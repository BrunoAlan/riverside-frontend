import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { cityBounds } from './city-bounds';

const city = (id: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'X',
  image: '/x.png',
  days: 'Day 1',
  lon,
  lat,
});

describe('cityBounds', () => {
  it('returns null for an empty list', () => {
    expect(cityBounds([])).toBeNull();
  });

  it('returns a zero-area box for a single city', () => {
    expect(cityBounds([city('a', 16.37, 48.2)])).toEqual([
      [16.37, 48.2],
      [16.37, 48.2],
    ]);
  });

  it('returns the min/max corners across several cities', () => {
    const bounds = cityBounds([
      city('budapest', 19.0402, 47.4979),
      city('bratislava', 17.1077, 48.1486),
      city('vienna', 16.3738, 48.2082),
      city('durnstein', 15.52, 48.395),
    ]);
    expect(bounds).toEqual([
      [15.52, 47.4979], // [minLon, minLat]
      [19.0402, 48.395], // [maxLon, maxLat]
    ]);
  });
});
