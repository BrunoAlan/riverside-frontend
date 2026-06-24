import { SummaryPlaceholderCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryCityCard } from '@/components/panels/itinerary-summary/summary-city-card';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryItineraryColumn({
  itinerary,
}: {
  itinerary: ItinerarySummary['itinerary'];
}) {
  if (!itinerary) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.itinerary} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
          {itinerary.title ?? SUMMARY_PLACEHOLDER.title}
        </h3>
        <PipeSeparatedList items={itinerary.countries} className="mt-2 gap-x-2" />
        {itinerary.description && (
          <p className="text-foreground mt-4 text-base leading-relaxed">{itinerary.description}</p>
        )}
      </div>
      <div className="flex flex-col gap-8">
        {itinerary.cities.map((city) => (
          <SummaryCityCard key={city.id} city={city} />
        ))}
      </div>
    </div>
  );
}
