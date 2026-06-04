import { ArmchairIcon, BathtubIcon, BedIcon } from '@phosphor-icons/react';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

export function SummaryCabinCard({ cabin }: { cabin: Cabin }) {
  const meta = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.price_from)} EUR`,
    cabin.view,
  ];

  return (
    <div className="bg-beige-200 flex flex-col overflow-hidden rounded-2xl">
      <div className="h-72 sm:h-80">
        <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
      </div>
      <div className="flex flex-col gap-6 p-6 pt-2">
        <div>
          <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {cabin.name}
          </h3>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {meta.map((item, index) => (
              <span key={index} className="flex items-center gap-3">
                {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
            <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
          </div>
          <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
        </div>
      </div>
    </div>
  );
}
