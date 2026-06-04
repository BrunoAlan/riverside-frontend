import { describe, expect, it } from 'vitest';
import { UiCommand } from './commands';

describe('UiCommand schema', () => {
  it('parses show_discovery_canvas with empty payload', () => {
    const result = UiCommand.parse({
      type: 'show_discovery_canvas',
      correlationId: 'abc-123',
    });
    expect(result.type).toBe('show_discovery_canvas');
    expect(result.correlationId).toBe('abc-123');
  });

  it('parses soft_redirect with reason_code and missing', () => {
    const result = UiCommand.parse({
      type: 'soft_redirect',
      correlationId: 'abc-123',
      payload: { reason_code: 'MISSING_DATE_PREFERENCE', missing: ['dates'] },
    });
    if (result.type !== 'soft_redirect') throw new Error('discriminator failed');
    expect(result.payload.reason_code).toBe('MISSING_DATE_PREFERENCE');
    expect(result.payload.missing).toEqual(['dates']);
  });

  it('parses show_itinerary_options with a single rich itinerary', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: '64c2a3c4-2623-4f4b-99a3-bbc3bb1db205',
      payload: {
        itinerary: {
          id: 'danube_legends_from_budapest_to_vienna',
          name: 'Danube Legends from Budapest to Vienna',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22', '2026-05-06'],
          center: [16.570283333333332, 48.15495000000001],
          zoom: 6,
          cities: [
            {
              id: 'budapest',
              name: 'Budapest',
              country: 'Hungary',
              image: 'https://res.cloudinary.com/demo/image/upload/budapest.jpg',
              days: 'Days 1, 2, 6 & 7',
              lon: 19.0402,
              lat: 47.4979,
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.id).toBe('danube_legends_from_budapest_to_vienna');
    expect(result.payload.itinerary.center).toEqual([16.570283333333332, 48.15495000000001]);
    expect(result.payload.itinerary.cities).toHaveLength(1);
    expect(result.payload.itinerary.cities[0].name).toBe('Budapest');
  });

  it('parses show_destination_detail with destination and images', () => {
    const result = UiCommand.parse({
      type: 'show_destination_detail',
      correlationId: 'd1',
      payload: {
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: ['City of Music'],
        },
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
            caption: 'Vienna at dusk',
          },
          {
            url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
            caption: 'Riverside terrace',
          },
        ],
      },
    });
    if (result.type !== 'show_destination_detail') throw new Error('discriminator failed');
    expect(result.payload.destination.name).toBe('Vienna');
    expect(result.payload.destination.aliases).toEqual(['City of Music']);
    expect(result.payload.images).toHaveLength(2);
    expect(result.payload.images[0].url).toMatch(/^https:\/\//);
  });

  it('rejects show_destination_detail with non-url image url', () => {
    const out = UiCommand.safeParse({
      type: 'show_destination_detail',
      correlationId: 'd1',
      payload: {
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: [],
        },
        images: [{ url: '/dream/1.jpg', caption: 'Vienna' }],
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects show_destination_detail with empty images array', () => {
    const out = UiCommand.safeParse({
      type: 'show_destination_detail',
      correlationId: 'd1',
      payload: {
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: [],
        },
        images: [],
      },
    });
    expect(out.success).toBe(false);
  });

  it('accepts show_destination_detail with more than 5 images', () => {
    const out = UiCommand.safeParse({
      type: 'show_destination_detail',
      correlationId: 'd1',
      payload: {
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: [],
        },
        images: Array.from({ length: 7 }, (_, i) => ({
          url: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
          caption: String(i),
        })),
      },
    });
    expect(out.success).toBe(true);
  });

  it('rejects show_destination_detail with missing destination fields', () => {
    const out = UiCommand.safeParse({
      type: 'show_destination_detail',
      correlationId: 'd1',
      payload: {
        destination: {
          id: 'vienna',
          name: 'Vienna',
          // country missing
          region: 'Danube',
          aliases: [],
        },
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
            caption: 'Vienna',
          },
        ],
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects show_itinerary_options with zero cities', () => {
    const out = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlationId: 'abc-123',
      payload: {
        itinerary: {
          id: 'x',
          name: 'X',
          duration: { days: 1, nights: 0 },
          match_score: 1,
          departure_dates: [],
          center: [0, 0],
          zoom: 6,
          cities: [],
        },
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown command type', () => {
    const out = UiCommand.safeParse({
      type: 'totally_made_up',
      correlationId: 'abc-123',
    });
    expect(out.success).toBe(false);
  });

  it('rejects missing correlation_id', () => {
    const out = UiCommand.safeParse({ type: 'show_discovery_canvas' });
    expect(out.success).toBe(false);
  });

  it('parses show_itinerary_options with per-city day_details', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-daydetails',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              day_details: [{ day: 'Day 01', description: 'Arrive in Vienna.' }],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].day_details).toEqual([
      { day: 'Day 01', description: 'Arrive in Vienna.' },
    ]);
  });

  it('rejects a malformed day_details entry', () => {
    const parsed = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlationId: 'c-bad',
      payload: {
        itinerary: {
          id: 'x',
          name: 'X',
          duration: { days: 1, nights: 0 },
          match_score: 1,
          departure_dates: [],
          center: [0, 0],
          zoom: 1,
          cities: [
            {
              id: 'a',
              name: 'A',
              country: 'C',
              image: 'https://example.com/a.jpg',
              days: 'Day 1',
              lon: 0,
              lat: 0,
              day_details: [{ day: 'Day 01' }],
            },
          ],
        },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('parses show_itinerary_options with per-city experiences', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-experiences',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              experiences: [
                {
                  id: 'signature_vienna_belvedere_palace',
                  name: 'Signature Vienna: VIP Evening at Belvedere Palace',
                  type: 'private_concert_and_museum_visit',
                  venue: 'Belvedere Palace',
                  description: 'After-hours VIP experience at Belvedere Palace.',
                },
                {
                  id: 'signature_hungary_national_day',
                  name: 'Signature Hungary: National Day Celebration',
                  type: 'national_day_fireworks_event',
                  venue: null,
                  description: 'National Day celebration with fireworks from Vista Deck.',
                },
              ],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].experiences).toEqual([
      {
        id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        type: 'private_concert_and_museum_visit',
        venue: 'Belvedere Palace',
        description: 'After-hours VIP experience at Belvedere Palace.',
      },
      {
        id: 'signature_hungary_national_day',
        name: 'Signature Hungary: National Day Celebration',
        type: 'national_day_fireworks_event',
        venue: null,
        description: 'National Day celebration with fireworks from Vista Deck.',
      },
    ]);
  });

  it('parses a per-city experience with images', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-exp-images',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              experiences: [
                {
                  id: 'signature_vienna_belvedere_palace',
                  name: 'Signature Vienna: VIP Evening at Belvedere Palace',
                  type: 'private_concert_and_museum_visit',
                  venue: 'Belvedere Palace',
                  description: 'After-hours VIP experience at Belvedere Palace.',
                  images: [
                    'https://example.com/belvedere-1.jpg',
                    'https://example.com/belvedere-2.jpg',
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].experiences?.[0].images).toEqual([
      'https://example.com/belvedere-1.jpg',
      'https://example.com/belvedere-2.jpg',
    ]);
  });

  it('parses a per-city experience with a singular image', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-exp-image',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              experiences: [
                {
                  id: 'signature_vienna_belvedere_palace',
                  name: 'Signature Vienna: VIP Evening at Belvedere Palace',
                  type: 'private_concert_and_museum_visit',
                  venue: 'Belvedere Palace',
                  description: 'After-hours VIP experience at Belvedere Palace.',
                  image: 'https://example.com/belvedere.jpg',
                },
              ],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].experiences?.[0].image).toBe(
      'https://example.com/belvedere.jpg'
    );
  });

  it('rejects a malformed experience entry', () => {
    const parsed = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlationId: 'c-bad-exp',
      payload: {
        itinerary: {
          id: 'x',
          name: 'X',
          duration: { days: 1, nights: 0 },
          match_score: 1,
          departure_dates: [],
          center: [0, 0],
          zoom: 1,
          cities: [
            {
              id: 'a',
              name: 'A',
              country: 'C',
              image: 'https://example.com/a.jpg',
              days: 'Day 1',
              lon: 0,
              lat: 0,
              experiences: [{ id: 'e1', name: 'No description' }],
            },
          ],
        },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('parses show_city_detail with a string city_id', () => {
    const result = UiCommand.parse({
      type: 'show_city_detail',
      correlationId: 'c-detail',
      payload: { city_id: 'vienna' },
    });
    if (result.type !== 'show_city_detail') throw new Error('discriminator failed');
    expect(result.payload.city_id).toBe('vienna');
  });

  it('parses show_city_detail with a null city_id (close)', () => {
    const result = UiCommand.parse({
      type: 'show_city_detail',
      correlationId: 'c-close',
      payload: { city_id: null },
    });
    if (result.type !== 'show_city_detail') throw new Error('discriminator failed');
    expect(result.payload.city_id).toBeNull();
  });

  it('rejects show_city_detail without a city_id', () => {
    const parsed = UiCommand.safeParse({
      type: 'show_city_detail',
      correlationId: 'c-bad',
      payload: {},
    });
    expect(parsed.success).toBe(false);
  });

  it('parses show_experience_detail with an experience_id', () => {
    const result = UiCommand.parse({
      type: 'show_experience_detail',
      correlationId: 'c-exp-1',
      payload: { experience_id: 'signature_vienna_belvedere_palace' },
    });
    if (result.type !== 'show_experience_detail') throw new Error('discriminator failed');
    expect(result.payload.experience_id).toBe('signature_vienna_belvedere_palace');
  });

  it('parses show_experience_detail with a null experience_id (close)', () => {
    const result = UiCommand.parse({
      type: 'show_experience_detail',
      correlationId: 'c-exp-2',
      payload: { experience_id: null },
    });
    if (result.type !== 'show_experience_detail') throw new Error('discriminator failed');
    expect(result.payload.experience_id).toBeNull();
  });
});

describe('set_booking_summary', () => {
  const validPayload = {
    people: { label: '2 People' },
    month: { label: 'March' },
    embarkation: { label: 'Budapest' },
    stops: { primary: 'Bratislava', extra: 3 },
    duration: { label: '5 days' },
    price: { label: 'from 2,368 pp.' },
    slots: [
      { label: 'Draft itinerary', state: 'active' as const },
      { label: 'Empty slot', state: 'empty' as const },
      { label: 'Empty slot', state: 'empty' as const },
    ],
    cta: { label: 'Continue to booking', enabled: true },
  };

  it('parses a fully populated snapshot', () => {
    const out = UiCommand.parse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: validPayload,
    });
    if (out.type !== 'set_booking_summary') throw new Error('discriminator failed');
    expect(out.payload.people).toEqual({ label: '2 People' });
    expect(out.payload.slots).toHaveLength(3);
    expect(out.payload.cta.enabled).toBe(true);
  });

  it('accepts null for all nullable fields', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: {
        ...validPayload,
        people: null,
        month: null,
        embarkation: null,
        stops: null,
        duration: null,
        price: null,
      },
    });
    expect(out.success).toBe(true);
  });

  it('normalizes { label: null } to null for label fields', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: {
        ...validPayload,
        price: { label: null },
        duration: { label: null },
      },
    });
    expect(out.success).toBe(true);
    if (!out.success || out.data.type !== 'set_booking_summary') {
      throw new Error('expected a valid set_booking_summary');
    }
    expect(out.data.payload.price).toBeNull();
    expect(out.data.payload.duration).toBeNull();
  });

  it('accepts an empty slots array', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: { ...validPayload, slots: [] },
    });
    expect(out.success).toBe(true);
  });

  it('rejects more than 6 slots', () => {
    const tooMany = Array.from({ length: 7 }, () => ({ label: 'x', state: 'empty' as const }));
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: { ...validPayload, slots: tooMany },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown slot state', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: {
        ...validPayload,
        slots: [{ label: 'x', state: 'pending' as unknown as 'active' }],
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects negative stops.extra', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlationId: 'b1',
      payload: { ...validPayload, stops: { primary: 'X', extra: -1 } },
    });
    expect(out.success).toBe(false);
  });
});

describe('show_cabin_detail', () => {
  it('parses with a string cabin_id', () => {
    const out = UiCommand.parse({
      type: 'show_cabin_detail',
      correlationId: 'cd1',
      payload: { cabin_id: 'owners-suite' },
    });
    if (out.type !== 'show_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBe('owners-suite');
  });

  it('parses with a null cabin_id', () => {
    const out = UiCommand.parse({
      type: 'show_cabin_detail',
      correlationId: 'cd1',
      payload: { cabin_id: null },
    });
    if (out.type !== 'show_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBeNull();
  });

  it('rejects a missing cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'show_cabin_detail',
      correlationId: 'cd1',
      payload: {},
    });
    expect(out.success).toBe(false);
  });

  it('rejects a numeric cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'show_cabin_detail',
      correlationId: 'cd1',
      payload: { cabin_id: 42 },
    });
    expect(out.success).toBe(false);
  });
});

describe('show_cabin_options', () => {
  const validCabin = {
    id: 'owners-suite',
    name: "Owner's Suite",
    image: '/cabin/1.png',
    guests: 2,
    area: 80,
    price_from: 12229,
    view: 'Balcony',
    detail: {
      gallery: ['/cabin-modal/1.png'],
      bedroom: ['King-size bed'],
      bathroom: ['Single vanity'],
      amenities: ['In-suite safe'],
    },
  };

  it('parses with a non-empty cabins array', () => {
    const out = UiCommand.parse({
      type: 'show_cabin_options',
      correlationId: 'co1',
      payload: { cabins: [validCabin] },
    });
    if (out.type !== 'show_cabin_options') throw new Error('discriminator failed');
    expect(out.payload.cabins).toHaveLength(1);
    expect(out.payload.cabins[0].price_from).toBe(12229);
    expect(out.payload.cabins[0].detail.amenities).toEqual(['In-suite safe']);
  });

  it('rejects an empty cabins array', () => {
    const out = UiCommand.safeParse({
      type: 'show_cabin_options',
      correlationId: 'co1',
      payload: { cabins: [] },
    });
    expect(out.success).toBe(false);
  });

  it('rejects a cabin missing the detail object', () => {
    const noDetail = {
      id: 'owners-suite',
      name: "Owner's Suite",
      image: '/cabin/1.png',
      guests: 2,
      area: 80,
      price_from: 12229,
      view: 'Balcony',
    };
    const out = UiCommand.safeParse({
      type: 'show_cabin_options',
      correlationId: 'co1',
      payload: { cabins: [noDetail] },
    });
    expect(out.success).toBe(false);
  });

  it('rejects a cabin whose detail.gallery is empty', () => {
    const out = UiCommand.safeParse({
      type: 'show_cabin_options',
      correlationId: 'co1',
      payload: { cabins: [{ ...validCabin, detail: { ...validCabin.detail, gallery: [] } }] },
    });
    expect(out.success).toBe(false);
  });
});
