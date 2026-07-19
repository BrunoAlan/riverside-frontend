// Radix dialog primitives directly (matching itinerary-summary-modal): the
// shadcn Dialog wrapper hardcodes a centered max-w-lg panel with a baked-in
// close button. This modal is a full-viewport takeover with its own chrome.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BookingFormTopBar } from '@/components/panels/booking-form/booking-form-top-bar';
import { CancellationPolicy } from '@/components/panels/booking-form/cancellation-policy';
import { type GuestField, GuestInfoForm } from '@/components/panels/booking-form/guest-info-form';
import { SummaryCabinCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryDetailsRow } from '@/components/panels/itinerary-summary/summary-details-row';
import { SummaryHeader } from '@/components/panels/itinerary-summary/summary-header';
import { SummaryPackageCard } from '@/components/panels/itinerary-summary/summary-package-card';
import { Button } from '@/components/ui/button';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import {
  useBookingForm,
  useCloseBookingForm,
  useSetAgreedFromUser,
  useSubmitBookingFormFromUser,
  useUpdateGuestFromUser,
} from '@/lib/agent-ui/hooks';
import { uiViewStore } from '@/lib/agent-ui/ui-view-store';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';
import type { GuestInfo } from '@/lib/booking-form/guests';
import type { BookingForm } from '@/lib/booking-form/types';

type BookingFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BookingForm;
  onGuestChange: (index: number, patch: Partial<GuestInfo>) => void;
  onGuestCommit: (index: number, field: GuestField, value: string) => void;
  onAgreedChange: (agreed: boolean) => void;
  onSubmit: () => void;
};

export function BookingFormModal({
  open,
  onOpenChange,
  data,
  onGuestChange,
  onGuestCommit,
  onAgreedChange,
  onSubmit,
}: BookingFormModalProps) {
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
              <div className="grid gap-8 px-4 pt-4 pb-8 sm:px-6 lg:grid-cols-2">
                {/* Left: trip recap (reused summary components) */}
                <div className="flex flex-col gap-6">
                  <SummaryHeader header={summary.header} />
                  <SummaryDetailsRow details={summary.details} />
                  <SummaryCabinCard cabin={summary.cabin} compact />
                  <SummaryPackageCard pkg={summary.package} />
                </div>

                {/* Right: guest form */}
                <div className="flex flex-col gap-8">
                  <fieldset disabled={data.status === 'submitting'} className="contents">
                    <GuestInfoForm
                      guests={data.guests}
                      onChange={onGuestChange}
                      onCommit={onGuestCommit}
                    />
                    <CancellationPolicy agreed={data.agreed} onAgreedChange={onAgreedChange} />
                  </fieldset>
                  <Button
                    className="w-full"
                    disabled={!data.agreed || data.status === 'submitting'}
                    onClick={onSubmit}
                  >
                    {data.status === 'submitting'
                      ? BOOKING_FORM_COPY.submitting
                      : BOOKING_FORM_COPY.submit}
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

// Store-connected mount point. Rendered at the app layout level (not inside the
// booking summary bar) so the modal opens whenever the bookingForm slice is set,
// independent of the current view or whether a booking summary exists.
export function BookingFormModalContainer() {
  const bookingForm = useBookingForm();
  const closeBookingForm = useCloseBookingForm();
  const updateGuestFromUser = useUpdateGuestFromUser();
  const setAgreedFromUser = useSetAgreedFromUser();
  const submitBookingFormFromUser = useSubmitBookingFormFromUser();
  const sendIntent = useFrontendIntent();

  if (!bookingForm) return null;
  return (
    <BookingFormModal
      open
      onOpenChange={(o) => {
        if (o) return;
        void sendIntent('abandon_booking_form', {
          entities: { status: bookingForm.status },
          userMessage: 'User closed the booking form',
        });
        closeBookingForm();
      }}
      data={bookingForm}
      onGuestChange={updateGuestFromUser}
      onGuestCommit={(index, field, value) => {
        void sendIntent('provide_guest_info', {
          entities: { guest_index: index, field, value },
          userMessage: `User filled ${field.replace('_', ' ')} for guest ${index + 1}`,
        });
      }}
      onAgreedChange={setAgreedFromUser}
      onSubmit={() => {
        submitBookingFormFromUser();
        const current = uiViewStore.getState().bookingForm;
        if (!current) return;
        void sendIntent('submit_booking_form', {
          entities: {
            guests: current.guests.map((g) => ({
              first_name: g.firstName,
              last_name: g.lastName,
              email: g.email,
              country_code: g.countryCode,
              phone: g.phone,
            })),
            agreed: true,
          },
          userMessage: 'User submitted the booking form',
        });
      }}
    />
  );
}
