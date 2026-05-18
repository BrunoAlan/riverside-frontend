import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type Cabin, formatCabinPrice } from '@/lib/cabins';

type CabinCardProps = {
  cabin: Cabin;
  interactive?: boolean;
  onExpand?: (cabin: Cabin) => void;
};

export function CabinCard({ cabin, interactive = true, onExpand }: CabinCardProps) {
  const info = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.priceFrom)} EUR`,
    cabin.view,
  ];

  return (
    <Card className="bg-beige-50 gap-0 overflow-hidden p-2.5">
      <Image
        src={cabin.image}
        alt={cabin.name}
        width={420}
        height={260}
        className="h-[200px] w-full rounded-lg object-cover"
      />
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <p className="font-display text-2xl leading-tight font-semibold">{cabin.name}</p>
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
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-2 text-sm">
        {info.map((item, index) => (
          <span key={index} className="flex items-center gap-3">
            {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
            {item}
          </span>
        ))}
      </div>
    </Card>
  );
}
