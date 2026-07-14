import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { parseCityDays } from '@/lib/map/parse-city-days';

export function buildExperienceDayOptions(cities: ItineraryCity[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const city of cities) {
    const days = parseCityDays(city.days);
    for (const experience of city.experiences ?? []) {
      map.set(experience.id, days);
    }
  }
  return map;
}
