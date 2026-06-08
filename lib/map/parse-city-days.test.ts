import { describe, expect, it } from 'vitest';
import { parseCityDays, parseDayNumbers } from './parse-city-days';

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

describe('parseDayNumbers', () => {
  it('pulls the day numbers out of a multi-day string', () => {
    expect(parseDayNumbers('Days 1, 2, 6 & 7')).toEqual([1, 2, 6, 7]);
  });

  it('handles a single day', () => {
    expect(parseDayNumbers('Day 12')).toEqual([12]);
  });

  it('returns an empty array when there are no numbers', () => {
    expect(parseDayNumbers('Flexible')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseDayNumbers('')).toEqual([]);
  });
});
