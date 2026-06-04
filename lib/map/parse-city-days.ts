// A city's `days` is a human string like "Days 1, 2 & 8". The experience day
// selector needs the individual days, so pull out the day numbers and render
// them as "Day N". Falls back to the raw string when it has no day numbers.
export function parseCityDays(days: string): string[] {
  const numbers = days.match(/\d+/g);
  if (!numbers) {
    return days ? [days] : [];
  }
  return numbers.map((n) => `Day ${n}`);
}
