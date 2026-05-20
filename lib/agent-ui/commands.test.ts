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
