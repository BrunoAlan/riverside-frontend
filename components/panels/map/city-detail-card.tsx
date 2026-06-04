'use client';

import Image from 'next/image';
import { XIcon } from '@phosphor-icons/react';
import { DaysBadge } from '@/components/shared/days-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ItineraryCity } from '@/lib/agent-ui/commands';

const CARD_WIDTH = 380;

type CityDetailCardProps = {
  city: ItineraryCity;
  onClose: () => void;
};

export function CityDetailCard({ city, onClose }: CityDetailCardProps) {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-full flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
      style={{ width: CARD_WIDTH }}
    >
      <div className="relative shrink-0">
        <Image
          src={city.image}
          alt={city.name}
          width={CARD_WIDTH}
          height={200}
          className="h-[200px] w-full rounded-lg object-cover"
        />
        <DaysBadge className="absolute top-1 left-1">{city.days}</DaysBadge>
      </div>
      <div className="flex shrink-0 items-start justify-between gap-2 px-2 pt-4">
        <div>
          <p className="text-2xl leading-tight">{city.name}</p>
          <p className="text-muted-foreground text-base">{city.country}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Close ${city.name} detail`}
          onClick={onClose}
        >
          <XIcon weight="bold" />
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-4 overflow-y-auto px-2 pb-2">
        {city.day_details?.map((detail, i) => (
          <div key={`${detail.day}-${i}`}>
            <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
              {detail.day}
            </p>
            <p className="text-primary mt-1 text-sm leading-relaxed">{detail.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
