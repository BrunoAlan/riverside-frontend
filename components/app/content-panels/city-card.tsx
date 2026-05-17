import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { City } from '@/lib/map/cities';

type CityCardProps = {
  city: City;
  interactive?: boolean;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, interactive = true, onExpand }: CityCardProps) {
  return (
    <Card className="bg-beige-50 w-[220px] gap-0 overflow-hidden p-2.5">
      <div className="relative">
        <Image
          src={city.image}
          alt={city.name}
          width={200}
          height={130}
          className="h-[130px] w-full rounded-lg object-cover"
        />
        <span className="bg-background/90 absolute top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap shadow-sm">
          {city.days}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-lg leading-tight font-semibold">{city.name}</p>
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
    </Card>
  );
}
