import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';

export function CancellationPolicy({
  agreed,
  onAgreedChange,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
}) {
  const c = BOOKING_FORM_COPY.cancellation;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-lg font-semibold text-neutral-700">{c.heading}</h3>
      <p className="text-foreground text-sm">{c.body}</p>
      <p className="text-muted-foreground text-sm">
        {c.detail}{' '}
        <a href="#" className="text-foreground underline underline-offset-2">
          {c.learnMore}
        </a>
      </p>
      <Label className="items-start gap-2">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => onAgreedChange(v === true)}
          className="mt-0.5"
        />
        <span className="text-muted-foreground text-sm font-normal">{c.terms}</span>
      </Label>
    </div>
  );
}
