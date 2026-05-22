import { describe, expect, it } from 'vitest';
import { UiCommand } from './commands';

describe('UiCommand schema', () => {
  it('parses show_discovery_canvas with empty payload', () => {
    const result = UiCommand.parse({
      type: 'show_discovery_canvas',
      correlation_id: 'abc-123',
    });
    expect(result.type).toBe('show_discovery_canvas');
    expect(result.correlation_id).toBe('abc-123');
  });

  it('parses soft_redirect with reason_code and missing', () => {
    const result = UiCommand.parse({
      type: 'soft_redirect',
      correlation_id: 'abc-123',
      payload: { reason_code: 'MISSING_DATE_PREFERENCE', missing: ['dates'] },
    });
    if (result.type !== 'soft_redirect') throw new Error('discriminator failed');
    expect(result.payload.reason_code).toBe('MISSING_DATE_PREFERENCE');
    expect(result.payload.missing).toEqual(['dates']);
  });

  it('parses show_itinerary_options with one option', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlation_id: 'abc-123',
      payload: {
        options: [
          {
            id: 'majesty_of_the_danube',
            name: 'Majesty of the Danube',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
        ],
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.options).toHaveLength(1);
    expect(result.payload.options[0].id).toBe('majesty_of_the_danube');
  });

  it('parses show_dream_stage with 1-5 images', () => {
    const result = UiCommand.parse({
      type: 'show_dream_stage',
      correlation_id: 'd1',
      payload: {
        images: [
          { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', tag: 'Venice' },
          { src: 'https://res.cloudinary.com/demo/image/upload/b.jpg', tag: 'Budapest' },
        ],
      },
    });
    if (result.type !== 'show_dream_stage') throw new Error('discriminator failed');
    expect(result.payload.images).toHaveLength(2);
    expect(result.payload.images[0].src).toMatch(/^https:\/\//);
  });

  it('rejects show_dream_stage with non-url src', () => {
    const out = UiCommand.safeParse({
      type: 'show_dream_stage',
      correlation_id: 'd1',
      payload: { images: [{ src: '/dream/1.jpg', tag: 'Venice' }] },
    });
    expect(out.success).toBe(false);
  });

  it('rejects show_dream_stage with more than 5 images', () => {
    const out = UiCommand.safeParse({
      type: 'show_dream_stage',
      correlation_id: 'd1',
      payload: {
        images: Array.from({ length: 6 }, (_, i) => ({
          src: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
          tag: String(i),
        })),
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects show_itinerary_options with zero options', () => {
    const out = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlation_id: 'abc-123',
      payload: { options: [] },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown command type', () => {
    const out = UiCommand.safeParse({
      type: 'totally_made_up',
      correlation_id: 'abc-123',
    });
    expect(out.success).toBe(false);
  });

  it('rejects missing correlation_id', () => {
    const out = UiCommand.safeParse({ type: 'show_discovery_canvas' });
    expect(out.success).toBe(false);
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
      correlation_id: 'b1',
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
      correlation_id: 'b1',
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

  it('accepts an empty slots array', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: { ...validPayload, slots: [] },
    });
    expect(out.success).toBe(true);
  });

  it('rejects more than 6 slots', () => {
    const tooMany = Array.from({ length: 7 }, () => ({ label: 'x', state: 'empty' as const }));
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: { ...validPayload, slots: tooMany },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown slot state', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
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
      correlation_id: 'b1',
      payload: { ...validPayload, stops: { primary: 'X', extra: -1 } },
    });
    expect(out.success).toBe(false);
  });
});

describe('set_cabin_detail', () => {
  it('parses with a string cabin_id', () => {
    const out = UiCommand.parse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: 'owners-suite' },
    });
    if (out.type !== 'set_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBe('owners-suite');
  });

  it('parses with a null cabin_id', () => {
    const out = UiCommand.parse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: null },
    });
    if (out.type !== 'set_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBeNull();
  });

  it('rejects a missing cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: {},
    });
    expect(out.success).toBe(false);
  });

  it('rejects a numeric cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: 42 },
    });
    expect(out.success).toBe(false);
  });
});
