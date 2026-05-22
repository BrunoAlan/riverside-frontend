'use client';

import { ArmchairIcon, BathtubIcon, BedIcon, XIcon } from '@phosphor-icons/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
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
    <DialogPrimitive.Root
      open={cabin != null}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
    >
      {cabin && (
        <DialogPrimitive.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="bg-beige-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 absolute inset-0 flex flex-col overflow-y-auto outline-none lg:flex-row lg:overflow-hidden"
        >
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:flex-1">
            <CabinDetailGallery images={[...CABIN_DETAIL.gallery]} alt={cabin.name} />
          </div>
          <div className="p-6 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <DialogPrimitive.Title className="font-display text-3xl leading-tight font-semibold text-neutral-700">
                {cabin.name}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="text-muted-foreground hover:bg-beige-300 focus-visible:ring-ring/50 -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:text-neutral-700 focus-visible:ring-[3px]"
              >
                <XIcon size={18} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              {cabin.name} cabin details
            </DialogPrimitive.Description>
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
        </DialogPrimitive.Content>
      )}
    </DialogPrimitive.Root>
  );
}
