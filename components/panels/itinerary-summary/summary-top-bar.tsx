import Image from 'next/image';
import { Save, Share, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { SUMMARY_CTA } from '@/lib/itinerary-summary/copy';

// Pinned chrome at the top of the summary modal: close/share/save controls,
// centered logo, and the primary CTAs. Rendered inside DialogPrimitive.Content
// so DialogPrimitive.Close resolves to the dialog root.
export function SummaryTopBar() {
  return (
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
          {SUMMARY_CTA.specialist}
        </Button>
        <Button>{SUMMARY_CTA.booking}</Button>
      </div>
    </div>
  );
}
