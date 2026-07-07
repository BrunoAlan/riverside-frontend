import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';

// Pinned chrome at the top of the checkout modal: title + close control.
// Rendered inside DialogPrimitive.Content so DialogPrimitive.Close resolves to
// the dialog root.
export function BookingFormTopBar() {
  return (
    <div className="z-10 flex shrink-0 items-center justify-between gap-3 rounded-t-3xl bg-neutral-50/95 px-4 py-3 backdrop-blur sm:px-6">
      <h2 className="font-display text-2xl font-semibold text-neutral-700">
        {BOOKING_FORM_COPY.title}
      </h2>
      <DialogPrimitive.Close asChild>
        <Button variant="secondary" size="icon-sm" aria-label="Close">
          <X className="size-4" />
        </Button>
      </DialogPrimitive.Close>
    </div>
  );
}
