import { describe, expect, it } from 'vitest';
import type { ItinerarySummaryWire } from '@/lib/agent-ui/commands';
import { toItinerarySummary } from './from-wire';

const wireFull: ItinerarySummaryWire = {
  header: { title: 'Danube', subtitle: 'Anniversary', image: '/h.jpg' },
  details: {
    guests: '2 people',
    month: 'September',
    embarkation: 'Vienna',
    stops: 'Budapest +3',
    dates: '20 – 27 Sep 2026',
    price_per_person: '€ 9,174 p.p.',
    cabin_name: "Owner's Suite",
  },
  cabin: {
    id: 'owners-suite',
    name: "Owner's Suite",
    image: '/cabin/1.png',
    guests: 2,
    area: 80,
    price_from: 12229,
    view: 'Balcony',
    detail: { gallery: ['/g1.png'], bedroom: [], bathroom: [], amenities: [] },
  },
  package: { price_per_person: '€ 9,174 p.p.', name: 'Premium', inclusions: ['Free Wifi'] },
  itinerary: {
    title: 'Vienna – Vienna',
    countries: ['Austria'],
    description: 'A week',
    cities: [{ id: 'vienna', name: 'Vienna', country: 'Austria', days: 'Days 1', image: '/v.jpg' }],
  },
  total: '€ 27,240',
};

describe('toItinerarySummary', () => {
  it('renames snake_case detail/package fields to camelCase', () => {
    const out = toItinerarySummary(wireFull);
    expect(out.details.pricePerPerson).toBe('€ 9,174 p.p.');
    expect(out.details.cabinName).toBe("Owner's Suite");
    expect(out.package?.pricePerPerson).toBe('€ 9,174 p.p.');
  });

  it('passes the cabin object through unchanged (already snake_case)', () => {
    const out = toItinerarySummary(wireFull);
    expect(out.cabin?.price_from).toBe(12229);
  });

  it('passes null sections and fields through', () => {
    const out = toItinerarySummary({
      header: { title: null, subtitle: null, image: null },
      details: {
        guests: null,
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: null,
        cabin_name: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    });
    expect(out.cabin).toBeNull();
    expect(out.package).toBeNull();
    expect(out.itinerary).toBeNull();
    expect(out.total).toBeNull();
    expect(out.details.cabinName).toBeNull();
  });
});
