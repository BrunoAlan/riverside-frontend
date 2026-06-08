// A city's `days` is a human string like "Days 1, 2 & 8". `parseDayNumbers`
// pulls the raw day numbers out (→ [1, 2, 8]); `parseCityDays` renders them as
// "Day N" for the experience day selector. Both return empty when the string
// has no day numbers — `parseCityDays` then falls back to the raw string so a
// free-form value like "Flexible" still shows.
export function parseDayNumbers(days: string): number[] {
  const numbers = days.match(/\d+/g);
  if (!numbers) return [];
  return numbers.map((n) => Number(n));
}

export function parseCityDays(days: string): string[] {
  const numbers = parseDayNumbers(days);
  if (numbers.length === 0) {
    return days ? [days] : [];
  }
  return numbers.map((n) => `Day ${n}`);
}
