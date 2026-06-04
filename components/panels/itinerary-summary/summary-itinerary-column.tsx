import { Fragment } from 'react';
import { SummaryCityCard } from '@/components/panels/itinerary-summary/summary-city-card';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryItineraryColumn({
  itinerary,
}: {
  itinerary: ItinerarySummary['itinerary'];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
          {itinerary.title}
        </h3>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 text-sm">
          {itinerary.countries.map((country, i) => (
            <Fragment key={country}>
              {i > 0 && <span className="bg-beige-300 h-3 w-px" aria-hidden />}
              <span>{country}</span>
            </Fragment>
          ))}
        </div>
        <p className="text-foreground mt-4 text-base leading-relaxed">{itinerary.description}</p>
      </div>
      <div className="flex flex-col gap-8">
        {itinerary.cities.map((city) => (
          <SummaryCityCard key={city.id} city={city} />
        ))}
      </div>
    </div>
  );
}
