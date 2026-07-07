# Booking Form Modal ("Checkout") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-viewport "Checkout" modal that mirrors the itinerary summary modal — trip recap on the left, an editable guest-info form on the right, no payment — triggered from the dev panel via a mock.

**Architecture:** Reuse the existing `ItinerarySummary` data and the `Summary*` components verbatim for the left column; add only the top bar, guest form, and cancellation policy. State flows through a new `bookingForm` slice on `uiViewStore` (dev-only, no wire command), rendered next to the itinerary summary modal in `booking-summary.tsx`. Guest fields live in local component state; Submit `console.log`s the collected data.

**Tech Stack:** Next.js + React, Zustand (`uiViewStore`), Radix dialog primitives, shadcn UI primitives, Tailwind, Vitest.

## Global Constraints

- **Package manager:** `pnpm`. Never `npm`/`yarn`.
- **Never edit `components/ui/`** by hand — all needed primitives (`input`, `label`, `select`, `checkbox`, `button`) already exist.
- **Reuse-first:** feed the modal from the existing `ItinerarySummary`; reuse `SummaryHeader`, `SummaryDetailsRow`, `SummaryCabinCard` (+ new `compact` prop), `SummaryPackageCard`. No new card components.
- **Tests only in `lib/**/*.test.ts`** — vitest does not collect component tests. UI is verified in the dev panel.
- **Tests live next to the code** (`foo.ts` ↔ `foo.test.ts`).
- **Before pushing/merging:** clean `pnpm lint` and `pnpm test`.
- Branch: `feat/booking-form-modal` (already created).

---

### Task 1: Guest helper (`lib/booking-form/guests.ts`)

Pure logic for building the initial guest array — the only unit-testable piece of the form.

**Files:**
- Create: `lib/booking-form/guests.ts`
- Test: `lib/booking-form/guests.test.ts`

**Interfaces:**
- Produces:
  - `type GuestInfo = { firstName: string; lastName: string; email: string; countryCode: string; phone: string }`
  - `makeEmptyGuests(count: number): GuestInfo[]` — `count` blank guests (clamps negatives to 0).

- [ ] **Step 1: Write the failing test**

Create `lib/booking-form/guests.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeEmptyGuests } from './guests';

describe('makeEmptyGuests', () => {
  it('returns count blank guests', () => {
    const guests = makeEmptyGuests(2);
    expect(guests).toHaveLength(2);
    expect(guests[0]).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: 'US',
      phone: '',
    });
  });

  it('returns independent objects, not shared references', () => {
    const guests = makeEmptyGuests(2);
    guests[0].firstName = 'Ada';
    expect(guests[1].firstName).toBe('');
  });

  it('returns an empty array for 0 or negative counts', () => {
    expect(makeEmptyGuests(0)).toEqual([]);
    expect(makeEmptyGuests(-3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test guests`
Expected: FAIL — cannot resolve `./guests` / `makeEmptyGuests is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/booking-form/guests.ts`:

```ts
export type GuestInfo = {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
};

export function makeEmptyGuests(count: number): GuestInfo[] {
  return Array.from({ length: Math.max(0, count) }, () => ({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: 'US',
    phone: '',
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test guests`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/booking-form/guests.ts lib/booking-form/guests.test.ts
git commit -m "feat(booking-form): add guest helper"
```

---

### Task 2: Type + store slice (`lib/booking-form/types.ts`, `ui-view-store.ts`, `hooks.ts`)

The `BookingForm` type and the dev-only store slice that holds it.

**Files:**
- Create: `lib/booking-form/types.ts`
- Modify: `lib/agent-ui/ui-view-store.ts` (state, actions)
- Modify: `lib/agent-ui/hooks.ts` (selectors)
- Test: `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: `ItinerarySummary` from `@/lib/itinerary-summary/types`.
- Produces:
  - `type BookingForm = { summary: ItinerarySummary; guestCount: number }`
  - store state `bookingForm: BookingForm | null`
  - actions `setBookingFormFromDev(form: BookingForm | null): void`, `closeBookingForm(): void`
  - hooks `useBookingForm()`, `useSetBookingFormFromDev()`, `useCloseBookingForm()`

- [ ] **Step 1: Create the type**

Create `lib/booking-form/types.ts`:

```ts
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

// The booking form reuses the itinerary data verbatim; the only booking-specific
// field is how many guest blocks to render.
export type BookingForm = {
  summary: ItinerarySummary;
  guestCount: number;
};
```

- [ ] **Step 2: Write the failing store test**

Add to `lib/agent-ui/ui-view-store.test.ts` (inside the top-level `describe`, after the itinerary-summary tests). This helper + two tests:

```ts
const SAMPLE_BOOKING_FORM = {
  summary: {
    header: { title: 'Danube', subtitle: null, image: null },
    details: {
      guests: '2 people',
      month: null,
      embarkation: null,
      stops: null,
      dates: null,
      pricePerPerson: null,
      cabinName: null,
    },
    cabin: null,
    package: null,
    itinerary: null,
    total: null,
  },
  guestCount: 2,
} as const;

it('setBookingFormFromDev fills the slice with source dev', () => {
  store.getState().setBookingFormFromDev(SAMPLE_BOOKING_FORM);
  const s = store.getState();
  expect(s.bookingForm?.guestCount).toBe(2);
  expect(s.bookingForm?.summary.header.title).toBe('Danube');
  expect(s.source).toBe('dev');
});

it('closeBookingForm clears the slice with source user', () => {
  store.getState().setBookingFormFromDev(SAMPLE_BOOKING_FORM);
  store.getState().closeBookingForm();
  const s = store.getState();
  expect(s.bookingForm).toBeNull();
  expect(s.source).toBe('user');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test ui-view-store`
Expected: FAIL — `setBookingFormFromDev is not a function`.

- [ ] **Step 4: Add the slice to the store**

In `lib/agent-ui/ui-view-store.ts`:

1. Add the import near the other type import:

```ts
import type { BookingForm } from '@/lib/booking-form/types';
```

2. In the `UiViewState` interface, add state + actions (next to `itinerarySummary`):

```ts
  bookingForm: BookingForm | null;
```
```ts
  setBookingFormFromDev: (form: BookingForm | null) => void;
  closeBookingForm: () => void;
```

3. In the initial state object (next to `itinerarySummary: null,`):

```ts
        bookingForm: null,
```

4. Add the two actions after `closeItinerarySummary`:

```ts
        setBookingFormFromDev: (form) =>
          set(
            { bookingForm: form, source: 'dev', lastCorrelationId: null },
            false,
            'setBookingFormFromDev'
          ),

        closeBookingForm: () =>
          set(
            { bookingForm: null, source: 'user', lastCorrelationId: null },
            false,
            'closeBookingForm'
          ),
```

- [ ] **Step 5: Add the hooks**

In `lib/agent-ui/hooks.ts`, append:

```ts
export const useBookingForm = () => useUiViewStore((s) => s.bookingForm);
export const useSetBookingFormFromDev = () => useUiViewStore((s) => s.setBookingFormFromDev);
export const useCloseBookingForm = () => useUiViewStore((s) => s.closeBookingForm);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test ui-view-store`
Expected: PASS (including the 2 new tests).

- [ ] **Step 7: Commit**

```bash
git add lib/booking-form/types.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/hooks.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(booking-form): add bookingForm store slice"
```

---

### Task 3: Copy, mock, and dev-panel wiring

Data + the dev-panel trigger. No unit test — verified in the dev panel once the modal exists (Task 5).

**Files:**
- Create: `lib/booking-form/copy.ts`
- Create: `lib/booking-form/mock.ts`
- Modify: `lib/dev/mocks.ts` (add `BOOKING_FORM_MOCKS`)
- Modify: `lib/dev/dev-panel.tsx` (add "booking form" section)

**Interfaces:**
- Consumes: `BookingForm` (Task 2), `ITINERARY_SUMMARY_MOCK` + `ItinerarySummary` from `@/lib/itinerary-summary/mock` / `types`, `useSetBookingFormFromDev` (Task 2).
- Produces:
  - `BOOKING_FORM_COPY` (labels + cancellation policy)
  - `BOOKING_FORM_MOCK: BookingForm`
  - `BOOKING_FORM_MOCKS: readonly BookingFormMock[]` where `BookingFormMock = { id: string; label: string; form: BookingForm | null }`

- [ ] **Step 1: Create the copy**

Create `lib/booking-form/copy.ts`:

```ts
// Copy for the booking form (checkout) modal, kept in one place like the
// itinerary summary's copy.ts.
export const BOOKING_FORM_COPY = {
  title: 'Checkout',
  guestBlock: (n: number) => `#${n} Guest information`,
  fields: {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone number',
  },
  emailPlaceholder: 'name@gmail.com',
  phonePlaceholder: '+1 (555) 000-0000',
  cancellation: {
    heading: 'Cancellation policy',
    body: 'Free cancellation before November 01.',
    detail: 'After that, the reservation is non-refundable.',
    learnMore: 'Learn more',
    terms: 'I agree to the Terms of Services, booking and cancellation policy',
  },
  submit: 'Submit',
} as const;
```

- [ ] **Step 2: Create the mock**

Create `lib/booking-form/mock.ts`:

```ts
import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
import type { BookingForm } from './types';

// Reuse the itinerary summary data verbatim — the checkout recap is the same
// destination / cabin / package the guest just configured.
export const BOOKING_FORM_MOCK: BookingForm = {
  summary: ITINERARY_SUMMARY_MOCK,
  guestCount: 2,
};
```

- [ ] **Step 3: Add the dev mocks**

In `lib/dev/mocks.ts`:

1. Add imports near the itinerary-summary import:

```ts
import { BOOKING_FORM_MOCK } from '@/lib/booking-form/mock';
import type { BookingForm } from '@/lib/booking-form/types';
```

2. Append at the end of the file (mirrors `ItinerarySummaryMock`). Note `EMPTY_ITINERARY_SUMMARY` is already defined above in this file — reuse it for the edge mock:

```ts
export interface BookingFormMock {
  id: string;
  label: string;
  form: BookingForm | null;
}

export const BOOKING_FORM_MOCKS: readonly BookingFormMock[] = [
  { id: 'clear', label: 'Closed (null)', form: null },
  { id: 'full', label: 'Full (2 guests)', form: BOOKING_FORM_MOCK },
  {
    id: 'single_empty',
    label: '1 guest, empty summary',
    form: { summary: EMPTY_ITINERARY_SUMMARY, guestCount: 1 },
  },
];
```

- [ ] **Step 4: Wire the dev panel**

In `lib/dev/dev-panel.tsx`:

1. Add `useSetBookingFormFromDev` to the existing hooks import from `@/lib/agent-ui/hooks`:

```ts
  useSetBookingFormFromDev,
```

2. Add `BOOKING_FORM_MOCKS` to the existing import from `./mocks`:

```ts
  BOOKING_FORM_MOCKS,
```

3. Near the other dev setters (after `setItinerarySummaryFromDev`):

```ts
  const setBookingFormFromDev = useSetBookingFormFromDev();
```

4. Near the other mock-id state (after `itinerarySummaryMockId`):

```ts
  const [bookingFormMockId, setBookingFormMockId] = useState(BOOKING_FORM_MOCKS[0]?.id ?? '');
```

5. Add the apply handler (after `applyItinerarySummary`):

```ts
  const applyBookingForm = () => {
    const chosen =
      BOOKING_FORM_MOCKS.find((m) => m.id === bookingFormMockId) ?? BOOKING_FORM_MOCKS[0];
    if (chosen) setBookingFormFromDev(chosen.form);
  };
```

6. Add the panel section in the JSX, right after the "itinerary summary" section's Apply button (after the block ending with `Apply summary` for itinerary):

```tsx
              <div className="mt-2 border-t border-white/20 pt-2">booking form</div>
              <label className="block">
                mock
                <select
                  className="mt-1 w-full bg-white/10 px-1 py-0.5"
                  value={bookingFormMockId}
                  onChange={(e) => setBookingFormMockId(e.target.value)}
                >
                  {BOOKING_FORM_MOCKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={applyBookingForm}
                className="w-full rounded bg-white text-black"
              >
                Apply booking form
              </button>
```

- [ ] **Step 5: Verify build + lint**

Run: `pnpm lint`
Expected: no errors. (Nothing renders the modal yet — that's Task 5.)

- [ ] **Step 6: Commit**

```bash
git add lib/booking-form/copy.ts lib/booking-form/mock.ts lib/dev/mocks.ts lib/dev/dev-panel.tsx
git commit -m "feat(booking-form): add copy, mock, and dev-panel trigger"
```

---

### Task 4: `compact` prop on `SummaryCabinCard`

Let the reused cabin card drop its detail sections for the checkout layout.

**Files:**
- Modify: `components/panels/itinerary-summary/summary-cabin-card.tsx`

**Interfaces:**
- Produces: `SummaryCabinCard({ cabin, compact }: { cabin: Cabin | null; compact?: boolean })` — when `compact`, renders image + name + meta line only (no bedroom/bathroom/amenities grid).

- [ ] **Step 1: Add the prop and short-circuit the detail grid**

In `components/panels/itinerary-summary/summary-cabin-card.tsx`, change the signature and gate the detail grid. Full updated component:

```tsx
export function SummaryCabinCard({
  cabin,
  compact = false,
}: {
  cabin: Cabin | null;
  compact?: boolean;
}) {
  if (!cabin) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.cabin} />;

  const meta = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.price_from)} EUR`,
    cabin.view,
  ];

  return (
    <div className="bg-beige-200 flex flex-col overflow-hidden rounded-2xl">
      <div className="h-72 sm:h-80">
        <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
      </div>
      <div className="flex flex-col gap-6 p-6 pt-2">
        <div>
          <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {cabin.name}
          </h3>
          <PipeSeparatedList items={meta} className="mt-2 gap-x-3 gap-y-1" />
        </div>
        {!compact && (
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="flex flex-col gap-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
            </div>
            <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + existing summary still works**

Run: `pnpm lint`
Expected: no errors. The itinerary summary modal calls `<SummaryCabinCard cabin={...} />` with no `compact`, so it defaults to `false` — unchanged behavior.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-cabin-card.tsx
git commit -m "feat(booking-form): add compact variant to SummaryCabinCard"
```

---

### Task 5: Modal shell + left column + render wiring

The dialog takeover, top bar, left column (reused cards), and rendering it from `booking-summary.tsx`. Right column is a placeholder here; the form arrives in Task 6.

**Files:**
- Create: `components/panels/booking-form/booking-form-top-bar.tsx`
- Create: `components/panels/booking-form/booking-form-modal.tsx`
- Modify: `components/agent-ui/booking-summary.tsx`

**Interfaces:**
- Consumes: `BookingForm` (Task 2), `useBookingForm` + `useCloseBookingForm` (Task 2), `SummaryHeader`, `SummaryDetailsRow`, `SummaryCabinCard` (+ `compact`), `SummaryPackageCard`, `BOOKING_FORM_COPY` (Task 3).
- Produces:
  - `BookingFormTopBar({ onClose }: { onClose: () => void })`
  - `BookingFormModal({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: BookingForm })`

- [ ] **Step 1: Create the top bar**

Create `components/panels/booking-form/booking-form-top-bar.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the modal shell (left column + placeholder right column)**

Create `components/panels/booking-form/booking-form-modal.tsx`:

```tsx
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
```

- [ ] **Step 3: Render it from `booking-summary.tsx`**

In `components/agent-ui/booking-summary.tsx`:

1. Add imports:

```ts
import { BookingFormModal } from '@/components/panels/booking-form/booking-form-modal';
```
And extend the existing `@/lib/agent-ui/hooks` import with:
```ts
  useBookingForm,
  useCloseBookingForm,
```

2. Inside `BookingSummary`, after the existing `closeItinerarySummary` hook call:

```ts
  const bookingForm = useBookingForm();
  const closeBookingForm = useCloseBookingForm();
```

3. After the existing `{itinerarySummary && ( ... )}` block, add:

```tsx
      {bookingForm && (
        <BookingFormModal
          open
          onOpenChange={(o) => {
            if (!o) closeBookingForm();
          }}
          data={bookingForm}
        />
      )}
```

- [ ] **Step 4: Verify in the dev panel**

Run: `pnpm dev`, open the app, click `dev` (bottom-right). First apply any `view` (e.g. `itinerary` → Apply view) and a booking summary so `BookingSummary` renders, then in the "booking form" section pick "Full (2 guests)" → **Apply booking form**.
Expected: the Checkout modal opens showing the top bar ("Checkout" + X), the destination header, the detail row, the compact Owner's Suite cabin card (no bedroom/bathroom/amenities sections), and the Package card. Right column is empty. X / overlay click closes it.

- [ ] **Step 5: Lint and commit**

Run: `pnpm lint`
Expected: no errors.

```bash
git add components/panels/booking-form/booking-form-top-bar.tsx components/panels/booking-form/booking-form-modal.tsx components/agent-ui/booking-summary.tsx
git commit -m "feat(booking-form): add modal shell and left column"
```

---

### Task 6: Guest form + cancellation policy + Submit (right column)

The editable form, terms gate, and Submit that logs the collected data.

**Files:**
- Create: `components/panels/booking-form/guest-info-form.tsx`
- Create: `components/panels/booking-form/cancellation-policy.tsx`
- Modify: `components/panels/booking-form/booking-form-modal.tsx`

**Interfaces:**
- Consumes: `GuestInfo` + `makeEmptyGuests` (Task 1), `BOOKING_FORM_COPY` (Task 3), shadcn `Input`/`Label`/`Select`/`Checkbox`/`Button`.
- Produces:
  - `GuestInfoForm({ guests, onChange }: { guests: GuestInfo[]; onChange: (index: number, patch: Partial<GuestInfo>) => void })`
  - `CancellationPolicy({ agreed, onAgreedChange }: { agreed: boolean; onAgreedChange: (v: boolean) => void })`

- [ ] **Step 1: Create the guest form**

Create `components/panels/booking-form/guest-info-form.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the cancellation policy + terms**

Create `components/panels/booking-form/cancellation-policy.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire the form into the modal (local state + Submit)**

In `components/panels/booking-form/booking-form-modal.tsx`:

1. Add `'use client';` as the very first line (it now uses hooks).

2. Add imports:

```ts
import { useState } from 'react';
import { CancellationPolicy } from '@/components/panels/booking-form/cancellation-policy';
import { GuestInfoForm } from '@/components/panels/booking-form/guest-info-form';
import { Button } from '@/components/ui/button';
import { BOOKING_FORM_COPY } from '@/lib/booking-form/copy';
import { makeEmptyGuests, type GuestInfo } from '@/lib/booking-form/guests';
```

3. Inside `BookingFormModal`, after `const { summary } = data;`:

```ts
  const [guests, setGuests] = useState<GuestInfo[]>(() => makeEmptyGuests(data.guestCount));
  const [agreed, setAgreed] = useState(false);

  const updateGuest = (index: number, patch: Partial<GuestInfo>) =>
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const handleSubmit = () => {
    // Dev-only: no backend submit yet — just surface the collected data.
    console.log('[booking-form] submit', { guests, agreed });
  };
```

4. Replace the placeholder right column (`<div />`) with:

```tsx
                {/* Right: guest form */}
                <div className="flex flex-col gap-8">
                  <GuestInfoForm guests={guests} onChange={updateGuest} />
                  <CancellationPolicy agreed={agreed} onAgreedChange={setAgreed} />
                  <Button className="w-full" disabled={!agreed} onClick={handleSubmit}>
                    {BOOKING_FORM_COPY.submit}
                  </Button>
                </div>
```

- [ ] **Step 4: Verify in the dev panel**

Run: `pnpm dev`, open the Checkout modal (as in Task 5, "Full (2 guests)").
Expected:
- Two "#1 / #2 Guest information" blocks, each with First/Last name, Email, Phone (US select + number).
- Typing in a field updates it (controlled inputs).
- The Submit button is disabled until the terms checkbox is checked.
- With terms checked, clicking Submit logs `[booking-form] submit { guests, agreed }` in the console with the typed values.
- Switch the mock to "1 guest, empty summary" → Apply: one guest block, placeholder cards on the left.

- [ ] **Step 5: Lint, test, commit**

Run: `pnpm lint && pnpm test`
Expected: both pass.

```bash
git add components/panels/booking-form/guest-info-form.tsx components/panels/booking-form/cancellation-policy.tsx components/panels/booking-form/booking-form-modal.tsx
git commit -m "feat(booking-form): add guest form, cancellation policy, and submit"
```

---

## Final verification

- [ ] `pnpm lint` — clean
- [ ] `pnpm test` — all pass (new: `guests.test.ts`, 2 store tests)
- [ ] Dev-panel walkthrough: open modal, both mocks render, form edits, terms-gated Submit logs data.

## Notes for the implementer

- **Select imports:** `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` all come from `@/components/ui/select` (already exported there). Do not add a new primitive.
- **`icon-sm` button size** is used by the existing summary top bar — it exists on the shadcn `Button`.
- **No wire command** this iteration — do not add a `case` to `applyCommand` or a schema to `commands.ts`. The `_exhaustive: never` guard must keep compiling.
- If `pnpm dev` isn't already running, the user runs it — ask before starting long-lived processes.
