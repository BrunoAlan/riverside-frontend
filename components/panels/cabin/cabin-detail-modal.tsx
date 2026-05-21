'use client';

import { ArmchairIcon, BathtubIcon, BedIcon } from '@phosphor-icons/react';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CABIN_DETAIL, type Cabin, formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
};

function DetailSection({
  icon: SectionIcon,
  title,
  items,
}: {
  icon: typeof BedIcon;
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 pb-2">
        <SectionIcon className="text-neutral-700" size={20} />
        <h3 className="font-display text-lg font-semibold text-neutral-700">{title}</h3>
      </div>
      <ul className="border-border border-t">
        {items.map((item) => (
          <li key={item} className="border-border text-muted-foreground border-b py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CabinDetailModal({ cabin, onClose }: CabinDetailModalProps) {
  return (
    <Dialog open={cabin != null} onOpenChange={(open) => !open && onClose()}>
      {cabin && (
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 lg:h-[90vh] lg:flex-row">
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:w-1/2">
            <CabinDetailGallery images={[...CABIN_DETAIL.gallery]} alt={cabin.name} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:w-1/2">
            <DialogTitle className="font-display text-3xl leading-tight font-semibold text-neutral-700">
              {cabin.name}
            </DialogTitle>
            <DialogDescription className="sr-only">{cabin.name} cabin details</DialogDescription>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {[
                `${cabin.guests} guests`,
                `${cabin.area}m²`,
                `from ${formatCabinPrice(cabin.priceFrom)} EUR`,
                cabin.view,
              ].map((item, index) => (
                <span key={index} className="flex items-center gap-3">
                  {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={CABIN_DETAIL.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={CABIN_DETAIL.bathroom} />
              <DetailSection icon={ArmchairIcon} title="Amenities" items={CABIN_DETAIL.amenities} />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
