import { ChevronRight } from 'lucide-react';
import { SummaryPlaceholderCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { Button } from '@/components/ui/button';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummaryPackage } from '@/lib/itinerary-summary/types';

export function SummaryPackageCard({ pkg }: { pkg: ItinerarySummaryPackage | null }) {
  if (!pkg) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.package} />;

  return (
    <div className="bg-beige-200 flex flex-col gap-5 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-neutral-700">Package</h3>
        <Button variant="link" size="sm" className="gap-1 px-0">
          Change package
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="border-beige-300 rounded-2xl border p-5">
        {pkg.pricePerPerson && (
          <div className="flex items-center gap-2">
            <span className="bg-primary size-2.5 rounded-full" aria-hidden />
            <span className="text-foreground text-sm">{pkg.pricePerPerson}</span>
          </div>
        )}
        <p className="font-display mt-4 text-2xl leading-snug font-semibold text-neutral-700">
          {pkg.name ?? SUMMARY_PLACEHOLDER.package}
        </p>
        <ul className="border-beige-300 mt-4 border-t">
          {pkg.inclusions.map((item) => (
            <li
              key={item}
              className="border-beige-300 text-muted-foreground border-b py-3 text-sm last:border-b-0"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
