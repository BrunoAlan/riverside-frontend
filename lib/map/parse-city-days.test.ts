import { describe, expect, it } from 'vitest';
import { parseCityDays } from './parse-city-days';

describe('parseCityDays', () => {
  it('splits a comma + ampersand day string into individual days', () => {
    expect(parseCityDays('Days 1, 2 & 8')).toEqual(['Day 1', 'Day 2', 'Day 8']);
  });

  it('splits a four-day string with multiple commas', () => {
    expect(parseCityDays('Days 1, 2, 6 & 7')).toEqual(['Day 1', 'Day 2', 'Day 6', 'Day 7']);
  });

  it('splits a two-day ampersand string', () => {
    expect(parseCityDays('Days 3 & 4')).toEqual(['Day 3', 'Day 4']);
  });

  it('handles a single day', () => {
    expect(parseCityDays('Day 1')).toEqual(['Day 1']);
  });

  it('falls back to the raw string when no day numbers are present', () => {
    expect(parseCityDays('Flexible')).toEqual(['Flexible']);
  });

  it('returns an empty list for an empty string', () => {
    expect(parseCityDays('')).toEqual([]);
  });
});
