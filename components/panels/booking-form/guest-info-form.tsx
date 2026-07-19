import { useRef } from 'react';
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
import { COUNTRY_CODES, type GuestInfo } from '@/lib/booking-form/guests';

export type GuestField = 'first_name' | 'last_name' | 'email' | 'country_code' | 'phone';

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
  onCommit,
}: {
  guests: GuestInfo[];
  onChange: (index: number, patch: Partial<GuestInfo>) => void;
  /** A field the user finished editing: blur after typing, or a select pick. */
  onCommit: (index: number, field: GuestField, value: string) => void;
}) {
  // Fields touched by the keyboard since their last commit, keyed to the last
  // value the user typed. Agent-driven updates re-render values but never mark
  // dirty, so they never re-emit. If an agent write lands between a keystroke
  // and the blur, the store value at blur no longer matches what the user
  // typed — commit nothing rather than echo the agent's own write back to it.
  const dirty = useRef(new Map<string, string>());
  const markDirty = (i: number, field: GuestField, value: string) =>
    dirty.current.set(`${i}.${field}`, value);
  const commitIfDirty = (i: number, field: GuestField, value: string) => {
    const key = `${i}.${field}`;
    const typed = dirty.current.get(key);
    dirty.current.delete(key);
    if (typed === undefined || typed !== value) return;
    onCommit(i, field, value);
  };

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
              onChange={(e) => {
                markDirty(i, 'first_name', e.target.value);
                onChange(i, { firstName: e.target.value });
              }}
              onBlur={(e) => commitIfDirty(i, 'first_name', e.target.value)}
            />
          </Field>
          <Field label={f.lastName}>
            <Input
              value={guest.lastName}
              onChange={(e) => {
                markDirty(i, 'last_name', e.target.value);
                onChange(i, { lastName: e.target.value });
              }}
              onBlur={(e) => commitIfDirty(i, 'last_name', e.target.value)}
            />
          </Field>
          <Field label={f.email}>
            <Input
              type="email"
              placeholder={BOOKING_FORM_COPY.emailPlaceholder}
              value={guest.email}
              onChange={(e) => {
                markDirty(i, 'email', e.target.value);
                onChange(i, { email: e.target.value });
              }}
              onBlur={(e) => commitIfDirty(i, 'email', e.target.value)}
            />
          </Field>
          <Field label={f.phone}>
            <div className="flex gap-2">
              <Select
                value={guest.countryCode}
                onValueChange={(v) => {
                  onChange(i, { countryCode: v });
                  onCommit(i, 'country_code', v);
                }}
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
                onChange={(e) => {
                  markDirty(i, 'phone', e.target.value);
                  onChange(i, { phone: e.target.value });
                }}
                onBlur={(e) => commitIfDirty(i, 'phone', e.target.value)}
              />
            </div>
          </Field>
        </div>
      ))}
    </div>
  );
}
