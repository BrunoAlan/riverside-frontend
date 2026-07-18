import type { Experience, ItineraryCity } from '@/lib/agent-ui/commands';
import { parseCityDays } from '@/lib/map/parse-city-days';

export type ExcursionItem = {
  experience: Experience;
  dayOptions: string[];
};

// Flattens the itinerary's experiences into a single list for the Excursions grid,
// carrying each experience's owning city days forward so a card can render its day
// badge and selector without looking the city up again.
export function buildExcursionItems(cities: ItineraryCity[]): ExcursionItem[] {
  return cities.flatMap((city) => {
    const dayOptions = parseCityDays(city.days);
    return (city.experiences ?? []).map((experience) => ({ experience, dayOptions }));
  });
}
