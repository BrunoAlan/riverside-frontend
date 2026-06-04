import { ArmchairIcon, BathtubIcon, BedIcon, XIcon } from '@phosphor-icons/react';
// Radix dialog primitives directly, not the shadcn Dialog wrapper: that wrapper
// hardcodes a fixed, body-portaled, viewport-wide overlay. This detail view must
// stay confined to the cabin panel, so it renders inline (no Portal) with
// modal={false} — keeping the bottom bar and voice input interactive.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
};

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
          className="bg-beige-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 absolute inset-0 flex flex-col overflow-y-auto pt-16 outline-none lg:flex-row lg:overflow-hidden"
        >
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:flex-1">
            <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
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
            <PipeSeparatedList
              items={[
                `${cabin.guests} guests`,
                `${cabin.area}m²`,
                `from ${formatCabinPrice(cabin.price_from)} EUR`,
                cabin.view,
              ]}
              className="mt-2 gap-x-3 gap-y-1"
            />
            <div className="mt-6 flex flex-col gap-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
              <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
            </div>
          </div>
        </DialogPrimitive.Content>
      )}
    </DialogPrimitive.Root>
  );
}
