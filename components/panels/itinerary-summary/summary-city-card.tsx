import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { DaysBadge } from '@/components/shared/days-badge';
import type { SummaryItineraryCity } from '@/lib/itinerary-summary/types';

export function SummaryCityCard({ city }: { city: SummaryItineraryCity }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-60 w-full overflow-hidden rounded-2xl">
        <Image
          src={city.image}
          alt={city.name}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {city.name}
          </h4>
          <p className="text-muted-foreground mt-1 text-base">{city.country}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DaysBadge>{city.days}</DaysBadge>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            More information
            <ChevronDown className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
