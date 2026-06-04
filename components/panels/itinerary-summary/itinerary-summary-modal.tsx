import Image from 'next/image';
import { Save, Share, X } from 'lucide-react';
// Radix dialog primitives directly (matching cabin-detail-modal): the shadcn
// Dialog wrapper hardcodes a centered max-w-lg panel with a baked-in close
// button. This modal is a full-viewport takeover with its own chrome.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { SummaryCabinCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryDetailsRow } from '@/components/panels/itinerary-summary/summary-details-row';
import { SummaryFooterBar } from '@/components/panels/itinerary-summary/summary-footer-bar';
import { SummaryHeader } from '@/components/panels/itinerary-summary/summary-header';
import { SummaryItineraryColumn } from '@/components/panels/itinerary-summary/summary-itinerary-column';
import { SummaryPackageCard } from '@/components/panels/itinerary-summary/summary-package-card';
import { Button } from '@/components/ui/button';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

type ItinerarySummaryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ItinerarySummary;
};

export function ItinerarySummaryModal({ open, onOpenChange, data }: ItinerarySummaryModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-center justify-center p-3 outline-none sm:p-6">
          <div className="relative flex max-h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl bg-neutral-50 shadow-xl">
            {/* Top bar (pinned) */}
            <div className="z-10 flex shrink-0 items-center justify-between gap-3 rounded-t-3xl bg-neutral-50/95 px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2">
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary" size="icon-sm" aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </DialogPrimitive.Close>
                <Button variant="secondary" size="icon-sm" aria-label="Share">
                  <Share className="size-4" />
                </Button>
                <Button variant="secondary" size="icon-sm" aria-label="Save">
                  <Save className="size-4" />
                </Button>
              </div>
              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 sm:block">
                <Image src="/riverside-logo.svg" alt="Riverside" width={64} height={48} />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="hidden sm:inline-flex">
                  Talk to a Riverside Specialist
                </Button>
                <Button>Continue to booking</Button>
              </div>
            </div>

            <DialogPrimitive.Title className="sr-only">{data.header.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {data.details.guests} · {data.details.dates} · {data.details.embarkation}
            </DialogPrimitive.Description>

            {/* Body (only this scrolls) */}
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-8 sm:px-6">
              <SummaryHeader header={data.header} />
              <SummaryDetailsRow details={data.details} />
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="flex flex-col gap-8">
                  <SummaryCabinCard cabin={data.cabin} />
                  <SummaryPackageCard pkg={data.package} />
                </div>
                <SummaryItineraryColumn itinerary={data.itinerary} />
              </div>
            </div>

            <SummaryFooterBar total={data.total} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
