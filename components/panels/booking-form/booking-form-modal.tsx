// Radix dialog primitives directly (matching itinerary-summary-modal): the
// shadcn Dialog wrapper hardcodes a centered max-w-lg panel with a baked-in
// close button. This modal is a full-viewport takeover with its own chrome.
import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BookingFormTopBar } from '@/components/panels/booking-form/booking-form-top-bar';
import { CancellationPolicy } from '@/components/panels/booking-form/cancellation-policy';
import { GuestInfoForm } from '@/components/panels/booking-form/guest-info-form';
import { SummaryCabinCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryDetailsRow } from '@/components/panels/itinerary-summary/summary-details-row';
import { SummaryHeader } from '@/components/panels/itinerary-summary/summary-header';
import { SummaryPackageCard } from '@/components/panels/itinerary-summary/summary-package-card';
import { Button } from '@/components/ui/button';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';
import { type GuestInfo, makeEmptyGuests } from '@/lib/booking-form/guests';
import type { BookingForm } from '@/lib/booking-form/types';

type BookingFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BookingForm;
};

export function BookingFormModal({ open, onOpenChange, data }: BookingFormModalProps) {
  const { summary } = data;
  const [guests, setGuests] = useState<GuestInfo[]>(() => makeEmptyGuests(data.guestCount));
  const [agreed, setAgreed] = useState(false);

  const updateGuest = (index: number, patch: Partial<GuestInfo>) =>
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const handleSubmit = () => {
    // Dev-only: no backend submit yet — just surface the collected data.
    console.log('[booking-form] submit', { guests, agreed });
  };
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

                {/* Right: guest form */}
                <div className="flex flex-col gap-8">
                  <GuestInfoForm guests={guests} onChange={updateGuest} />
                  <CancellationPolicy agreed={agreed} onAgreedChange={setAgreed} />
                  <Button className="w-full" disabled={!agreed} onClick={handleSubmit}>
                    {BOOKING_FORM_COPY.submit}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
