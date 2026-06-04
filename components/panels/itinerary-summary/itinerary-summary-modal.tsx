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
import { SummaryTopBar } from '@/components/panels/itinerary-summary/summary-top-bar';
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
            <SummaryTopBar />

            <DialogPrimitive.Title className="sr-only">{data.header.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {data.details.guests} · {data.details.dates} · {data.details.embarkation}
            </DialogPrimitive.Description>

            {/* Scroll area — top bar stays pinned, footer scrolls with content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-8 px-4 pb-8 sm:px-6">
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
