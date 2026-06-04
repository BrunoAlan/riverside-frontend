import Image from 'next/image';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryHeader({ header }: { header: ItinerarySummary['header'] }) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
      <Image
        src={header.image}
        alt={header.title}
        fill
        sizes="(min-width: 1280px) 1216px, 100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute right-6 bottom-6 left-6 text-white">
        <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
          {header.title}
        </h2>
        <p className="mt-2 text-base text-white/85 sm:text-lg">{header.subtitle}</p>
      </div>
    </div>
  );
}
