import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { DaysBadge } from '@/components/shared/days-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { City } from '@/lib/map/cities';

// Fixed card width in px. Shared with the cluster layer so its grouping
// threshold stays in sync with the actual rendered card size.
export const CITY_CARD_WIDTH = 220;

type CityCardProps = {
  city: City;
  interactive?: boolean;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, interactive = true, onExpand }: CityCardProps) {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 gap-0 overflow-hidden rounded-2xl p-2 shadow-none"
      style={{ width: CITY_CARD_WIDTH }}
    >
      <div className="relative h-[130px] w-full">
        <Image
          src={city.image}
          alt={city.name}
          fill
          sizes="204px"
          className="rounded-lg object-cover"
        />
        <DaysBadge className="absolute top-1 left-1">{city.days}</DaysBadge>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-base leading-tight">{city.name}</p>
          <p className="text-muted-foreground text-sm">{city.country}</p>
        </div>
        {interactive && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Expand ${city.name}`}
            onClick={() => onExpand?.(city)}
          >
            <ArrowsOutSimpleIcon weight="bold" />
          </Button>
        )}
      </div>
      {city.experiences && city.experiences.length > 0 && (
        <div className="mt-3 flex justify-center">
          <span className="border-beige-300 text-muted-foreground rounded-full border px-3 py-1 text-xs whitespace-nowrap">
            {city.experiences.length} {city.experiences.length === 1 ? 'experience' : 'experiences'}{' '}
            available
          </span>
        </div>
      )}
    </Card>
  );
}
