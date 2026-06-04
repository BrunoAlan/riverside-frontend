import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import { Button } from '@/components/ui/button';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

type CabinCardProps = {
  cabin: Cabin;
  interactive?: boolean;
  onExpand?: (cabin: Cabin) => void;
};

export function CabinCard({ cabin, interactive = true, onExpand }: CabinCardProps) {
  const info = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.price_from)} EUR`,
    cabin.view,
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <Image
        src={cabin.image}
        alt={cabin.name}
        width={420}
        height={260}
        className="h-[200px] min-h-0 w-full flex-1 rounded-2xl object-cover lg:h-auto"
      />
      <div className="flex items-start justify-between gap-2 pt-2">
        <p className="font-display text-2xl leading-tight font-semibold text-neutral-700">
          {cabin.name}
        </p>
        {interactive && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Expand ${cabin.name}`}
            onClick={() => onExpand?.(cabin)}
          >
            <ArrowsOutSimpleIcon weight="bold" />
          </Button>
        )}
      </div>
      <PipeSeparatedList items={info} className="gap-x-3 gap-y-1" />
    </div>
  );
}
