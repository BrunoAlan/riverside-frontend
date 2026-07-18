// Day options arrive as "Day N" labels from parseCityDays. A card badge has room
// for one short line, so collapse them: "Day 1", "Days 1 & 3", "Days 1, 2 +2".
// Labels without a day number (parseCityDays' raw-string fallback) pass through.
export function formatDayBadge(days: string[]): string {
  if (days.length === 0) return '';

  const numbers = days.map((day) => day.match(/\d+/)?.[0]).filter((n): n is string => Boolean(n));
  if (numbers.length !== days.length) {
    return days.join(', ');
  }

  if (numbers.length === 1) return `Day ${numbers[0]}`;
  if (numbers.length === 2) return `Days ${numbers[0]} & ${numbers[1]}`;
  return `Days ${numbers[0]}, ${numbers[1]} +${numbers.length - 2}`;
}
