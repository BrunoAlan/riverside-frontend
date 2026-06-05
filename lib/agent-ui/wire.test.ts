import { describe, expect, it } from 'vitest';
import { decodeText, encodeJson } from './wire';

describe('wire codec', () => {
  it('round-trips a value through encodeJson and decodeText', () => {
    const value = { correlationId: 'env-1', commands: [{ type: 'show_discovery_canvas' }] };
    const bytes = encodeJson(value);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(decodeText(bytes))).toEqual(value);
  });
});
