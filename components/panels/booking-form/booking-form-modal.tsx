// Radix dialog primitives directly (matching itinerary-summary-modal): the
// shadcn Dialog wrapper hardcodes a centered max-w-lg panel with a baked-in
// close button. This modal is a full-viewport takeover with its own chrome.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BookingFormTopBar } from '@/components/panels/booking-form/booking-form-top-bar';
import { SummaryCabinCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryDetailsRow } from '@/components/panels/itinerary-summary/summary-details-row';
import { SummaryHeader } from '@/components/panels/itinerary-summary/summary-header';
import { SummaryPackageCard } from '@/components/panels/itinerary-summary/summary-package-card';
import type { BookingForm } from '@/lib/booking-form/types';

type BookingFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BookingForm;
};

export function BookingFormModal({ open, onOpenChange, data }: BookingFormModalProps) {
  const { summary } = data;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-center justify-center p-3 outline-none sm:p-6">
          <div className="relative flex max-h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl bg-neutral-50 shadow-xl">
            <BookingFormTopBar />

            <DialogPrimitive.Title className="sr-only">
              {summary.header.title ?? 'Checkout'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {[summary.details.guests, summary.details.dates, summary.details.embarkation]
                .filter(Boolean)
                .join(' · ')}
            </DialogPrimitive.Description>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-2">
                {/* Left: trip recap (reused summary components) */}
                <div className="flex flex-col gap-6">
                  <SummaryHeader header={summary.header} />
                  <SummaryDetailsRow details={summary.details} />
                  <SummaryCabinCard cabin={summary.cabin} compact />
                  <SummaryPackageCard pkg={summary.package} />
                </div>

                {/* Right: guest form — added in Task 6 */}
                <div />
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
