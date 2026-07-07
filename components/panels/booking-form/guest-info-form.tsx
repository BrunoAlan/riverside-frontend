import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';
import type { GuestInfo } from '@/lib/booking-form/guests';

const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'ES'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function GuestInfoForm({
  guests,
  onChange,
}: {
  guests: GuestInfo[];
  onChange: (index: number, patch: Partial<GuestInfo>) => void;
}) {
  const f = BOOKING_FORM_COPY.fields;
  return (
    <div className="flex flex-col gap-8">
      {guests.map((guest, i) => (
        <div key={i} className="flex flex-col gap-4">
          <h3 className="font-display text-lg font-semibold text-neutral-700">
            {BOOKING_FORM_COPY.guestBlock(i + 1)}
          </h3>
          <Field label={f.firstName}>
            <Input
              value={guest.firstName}
              onChange={(e) => onChange(i, { firstName: e.target.value })}
            />
          </Field>
          <Field label={f.lastName}>
            <Input
              value={guest.lastName}
              onChange={(e) => onChange(i, { lastName: e.target.value })}
            />
          </Field>
          <Field label={f.email}>
            <Input
              type="email"
              placeholder={BOOKING_FORM_COPY.emailPlaceholder}
              value={guest.email}
              onChange={(e) => onChange(i, { email: e.target.value })}
            />
          </Field>
          <Field label={f.phone}>
            <div className="flex gap-2">
              <Select
                value={guest.countryCode}
                onValueChange={(v) => onChange(i, { countryCode: v })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                className="flex-1"
                placeholder={BOOKING_FORM_COPY.phonePlaceholder}
                value={guest.phone}
                onChange={(e) => onChange(i, { phone: e.target.value })}
              />
            </div>
          </Field>
        </div>
      ))}
    </div>
  );
}
