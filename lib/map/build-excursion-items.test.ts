import { describe, expect, it } from 'vitest';
import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { buildExcursionItems } from './build-excursion-items';

function city(overrides: Partial<ItineraryCity>): ItineraryCity {
  return {
    id: 'city-1',
    name: 'Budapest',
    country: 'Hungary',
    image: 'budapest.jpg',
    days: 'Days 1 & 2',
    lon: 19.04,
    lat: 47.5,
    ...overrides,
  };
}

describe('buildExcursionItems', () => {
  it("pairs each experience with its own city's parsed days", () => {
    const cities: ItineraryCity[] = [
      city({
        id: 'budapest',
        name: 'Budapest',
        days: 'Days 1 & 2',
        experiences: [
          {
            id: 'exp-1',
            name: 'Thermal baths',
            type: 'wellness',
            venue: null,
            description: 'Relax.',
          },
        ],
      }),
      city({
        id: 'vienna',
        name: 'Vienna',
        days: 'Days 4, 5 & 6',
        experiences: [
          {
            id: 'exp-2',
            name: 'Opera tour',
            type: 'culture',
            venue: null,
            description: 'Backstage.',
          },
        ],
      }),
    ];

    const items = buildExcursionItems(cities);

    expect(items).toHaveLength(2);
    expect(items[0].experience.id).toBe('exp-1');
    expect(items[0].dayOptions).toEqual(['Day 1', 'Day 2']);
    expect(items[1].experience.id).toBe('exp-2');
    expect(items[1].dayOptions).toEqual(['Day 4', 'Day 5', 'Day 6']);
  });

  it('skips a city with no experiences', () => {
    expect(buildExcursionItems([city({ id: 'bratislava' })])).toEqual([]);
  });

  it('returns an empty list for no cities', () => {
    expect(buildExcursionItems([])).toEqual([]);
  });
});
