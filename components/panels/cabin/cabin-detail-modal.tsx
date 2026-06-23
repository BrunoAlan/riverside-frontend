import { ArmchairIcon, BathtubIcon, BedIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
// Radix dialog primitives directly, not the shadcn Dialog wrapper: that wrapper
// hardcodes a fixed, body-portaled, viewport-wide overlay. This detail view must
// stay confined to the cabin panel, so it renders inline (no Portal) with
// modal={false} — keeping the bottom bar and voice input interactive.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import { Button } from '@/components/ui/button';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
  onSelect: (cabin: Cabin) => void;
  selected: boolean;
};

export function CabinDetailModal({ cabin, onClose, onSelect, selected }: CabinDetailModalProps) {
  return (
    <DialogPrimitive.Root
      open={cabin != null}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
    >
      {cabin && (
        <DialogPrimitive.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="bg-beige-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 absolute inset-0 flex flex-col overflow-y-auto p-6 pt-16 outline-none lg:flex-row lg:overflow-hidden"
        >
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:flex-1">
            <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
          </div>
          <div className="flex flex-col lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
            <div className="from-beige-200 sticky top-0 bg-gradient-to-b from-80% p-6 pt-0">
              <div className="flex items-start justify-between gap-4">
                <DialogPrimitive.Title className="font-display text-3xl leading-tight">
                  {cabin.name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="bg-beige-300 hover:bg-beige-400/40 text-primary flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors outline-none"
                >
                  <XIcon size={18} />
                </DialogPrimitive.Close>
              </div>
              <DialogPrimitive.Description className="sr-only">
                {cabin.name} cabin details
              </DialogPrimitive.Description>
              <PipeSeparatedList
                items={[`${cabin.guests} guests`, `${cabin.area}m²`, cabin.view]}
                className="mt-1 gap-x-3 gap-y-1"
              />
            </div>
            <div className="flex flex-col gap-6 pr-6 pl-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
              <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
            </div>
            <div className="from-beige-200 sticky bottom-0 flex items-center justify-between bg-gradient-to-t from-70% p-6 pb-0">
              <div className="flex flex-col">
                <div className="text-sm">From</div>
                <div className="text-lg font-bold">${formatCabinPrice(cabin.price_from)} EUR</div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={selected}
                onClick={() => onSelect(cabin)}
              >
                {selected ? (
                  <>
                    <CheckIcon weight="bold" /> Selected
                  </>
                ) : (
                  'Select'
                )}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      )}
    </DialogPrimitive.Root>
  );
}
