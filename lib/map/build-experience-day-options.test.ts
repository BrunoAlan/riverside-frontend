import { describe, expect, it } from 'vitest';
import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { buildExperienceDayOptions } from './build-experience-day-options';

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

describe('buildExperienceDayOptions', () => {
  it("maps each experience to its own city's parsed days", () => {
    const cities: ItineraryCity[] = [
      city({
        id: 'budapest',
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

    const result = buildExperienceDayOptions(cities);

    expect(result.get('exp-1')).toEqual(['Day 1', 'Day 2']);
    expect(result.get('exp-2')).toEqual(['Day 4', 'Day 5', 'Day 6']);
  });

  it('skips a city with no experiences', () => {
    const cities: ItineraryCity[] = [city({ id: 'budapest', days: 'Day 1' })];

    const result = buildExperienceDayOptions(cities);

    expect(result.size).toBe(0);
  });

  it('returns an empty map for no cities', () => {
    expect(buildExperienceDayOptions([]).size).toBe(0);
  });
});
