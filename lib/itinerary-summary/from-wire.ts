import type { ItinerarySummaryWire } from '@/lib/agent-ui/commands';
import type { ItinerarySummary } from './types';

// Maps the snake_case wire payload to the internal camelCase ItinerarySummary.
// Only `details` and `package` carry renamed keys; everything else is identical,
// and the `cabin` object is already in the shared Cabin (snake_case) shape.
export function toItinerarySummary(wire: ItinerarySummaryWire): ItinerarySummary {
  return {
    header: wire.header,
    details: {
      guests: wire.details.guests,
      month: wire.details.month,
      embarkation: wire.details.embarkation,
      stops: wire.details.stops,
      dates: wire.details.dates,
      pricePerPerson: wire.details.price_per_person,
      cabinName: wire.details.cabin_name,
    },
    cabin: wire.cabin,
    package: wire.package
      ? {
          pricePerPerson: wire.package.price_per_person,
          name: wire.package.name,
          inclusions: wire.package.inclusions,
        }
      : null,
    itinerary: wire.itinerary,
    total: wire.total,
  };
}
