import type { City } from '@/lib/map/cities';
import { parseDayNumbers } from '@/lib/map/parse-city-days';

// One hop of the voyage, from one stop to the next in day order. `repeatIndex`
// counts how many earlier legs already ran along the same undirected corridor,
// so the geometry can fan repeated passes out instead of stacking them.
export type RouteLeg = {
  from: [number, number]; // [lon, lat]
  to: [number, number];
  fromId: string;
  toId: string;
  repeatIndex: number;
};

type Visit = { day: number; cityIndex: number; id: string; lon: number; lat: number };

// Rebuild the ordered voyage from the cities' free-text `days`. A city can
// appear on several days (and several cities can share a day), so we expand to
// one occurrence per day, sort by day — breaking ties by the city's position in
// the array, which already runs along the river — drop consecutive repeats of
// the same city, and connect what's left.
export function buildRouteLegs(cities: City[]): RouteLeg[] {
  const occurrences: Visit[] = [];
  cities.forEach((city, cityIndex) => {
    const days = parseDayNumbers(city.days);
    // No parseable day → fall back to array position so it still orders sanely.
    const effectiveDays = days.length > 0 ? days : [cityIndex];
    for (const day of effectiveDays) {
      occurrences.push({ day, cityIndex, id: city.id, lon: city.lon, lat: city.lat });
    }
  });

  occurrences.sort((a, b) => a.day - b.day || a.cityIndex - b.cityIndex);

  const visits: Visit[] = [];
  for (const occ of occurrences) {
    const prev = visits[visits.length - 1];
    if (prev && prev.id === occ.id) continue; // same city two days running = one stop
    visits.push(occ);
  }

  const corridorCount = new Map<string, number>();
  const legs: RouteLeg[] = [];
  for (let i = 0; i < visits.length - 1; i++) {
    const a = visits[i];
    const b = visits[i + 1];
    const key = [a.id, b.id].sort().join('—'); // undirected: A→B and B→A share a corridor
    const repeatIndex = corridorCount.get(key) ?? 0;
    corridorCount.set(key, repeatIndex + 1);
    legs.push({
      from: [a.lon, a.lat],
      to: [b.lon, b.lat],
      fromId: a.id,
      toId: b.id,
      repeatIndex,
    });
  }
  return legs;
}
