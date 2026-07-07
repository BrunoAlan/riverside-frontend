# Booking Form Modal ("Checkout") — Design

## Goal

A full-viewport takeover modal that mirrors the **itinerary summary modal** in
style and structure, but for the booking/checkout step. It shows the trip
recap (destination, cabin, package) on the left and an **editable guest
information form** on the right. **No payment section.** The primary CTA
collects the form data and (for now) logs it — no real submit / backend wiring.

Dev/mock only for this iteration: the modal is triggered from the dev panel via
a mock, exactly like the itinerary summary. A real wire command is out of scope.

## Reference

Direct sibling of `components/panels/itinerary-summary/`. Reuse its styling
tokens verbatim (`bg-neutral-50`, `rounded-3xl`, `max-w-[1280px]`,
`bg-beige-200`, `rounded-2xl`, `font-display`, etc.) so the two modals read as
one system.

## Reuse-first principle

**Always prefer the data already in the itinerary and the components already
implemented.** Concretely:

- The modal is fed from the **existing `ItinerarySummary`** shape/data (same
  mock, same `from-wire`), NOT a new duplicated data model. The only booking-
  specific field is `guestCount`.
- The left column **reuses the existing `Summary*` components directly**
  (`SummaryHeader`, `SummaryDetailsRow`, `SummaryCabinCard`,
  `SummaryPackageCard`). New components are added ONLY for the parts that don't
  exist yet (top bar, guest form, cancellation policy).
- Any "compact" look needed for a reused card is achieved with a prop on the
  existing component (e.g. `compact` on `SummaryCabinCard`), not a fork.

## Layout

Two columns inside a Radix dialog takeover (identical shell to
`itinerary-summary-modal.tsx`):

- **Top bar (pinned):** "Checkout" title on the left, close (X) button on the
  right. Simpler than `SummaryTopBar` (no logo / no dual CTAs).
- **Left column** (stacked cards, all reused from `itinerary-summary/`):
  - **Destination card** — reuse `SummaryHeader` (image + overlaid title), with
    `SummaryDetailsRow` beneath it for month · embarkation · stops · dates.
  - **Cabin card** — reuse `SummaryCabinCard` with a new `compact` prop that
    hides the bedroom/bathroom/amenities detail sections, leaving image + name +
    meta line (`2 guests | 80m2 | from 12,229 EUR | Balcony`).
  - **Package card** — reuse `SummaryPackageCard` as-is.
- **Right column** (the form):
  - **N × "#N Guest information"** blocks, where **N = `guestCount`** from the
    booking data. Each block: First name, Last name, Email, Phone (country
    `select` + number). Inputs are **editable with local React state**.
  - **Cancellation policy** — text + "Learn more" link.
  - **Terms checkbox** — "I agree to the Terms of Services, booking and
    cancellation policy".
  - **CTA: "Submit"** — gathers all guest fields + terms into one object and
    `console.log`s it. Disabled until terms is checked (matches the image's
    intent). **No payment fields.**

## Data & State

New folder `lib/booking-form/`:

- `types.ts` — thin wrapper over the existing summary type; no duplicated fields.

  ```ts
  import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

  export type BookingForm = {
    summary: ItinerarySummary; // reuse the itinerary data verbatim
    guestCount: number;
  };
  ```

- `mock.ts` — `BOOKING_FORM_MOCK` built from the existing
  `ITINERARY_SUMMARY_MOCK` (import it, don't duplicate): e.g.
  `{ summary: ITINERARY_SUMMARY_MOCK, guestCount: 2 }`. Add one edge mock
  (guestCount 1 and/or the partial/all-null summary mock).
- `copy.ts` — booking-specific labels + cancellation-policy copy only.

**Guest form state** lives locally in the modal: an array of
`GuestInfo = { firstName, lastName, email, countryCode, phone }` sized to
`guestCount`, plus an `agreed` boolean for the checkbox. Nothing is persisted;
`onSubmit` only logs.

The only non-trivial pure logic — building the initial empty guest array from
`guestCount` — is extracted to `lib/booking-form/guests.ts`
(`GuestInfo` type + `makeEmptyGuests(count: number): GuestInfo[]`) so it can be
unit-tested. The component consumes it for its initial `useState`.

### Store slice

Mirror the `itinerarySummary` slice in `lib/agent-ui/ui-view-store.ts`:

- state: `bookingForm: BookingForm | null`
- actions: `setBookingFormFromDev(form)`, `closeBookingForm()`
- hooks in `lib/agent-ui/hooks.ts`: `useBookingForm`, `useSetBookingFormFromDev`,
  `useCloseBookingForm`.

No `applyCommand` case (no wire command this iteration).

## Components (`components/panels/booking-form/`)

New files (only what doesn't already exist):

| File | Purpose |
| --- | --- |
| `booking-form-modal.tsx` | Dialog shell + 2-col grid (mirrors `itinerary-summary-modal.tsx`). Owns guest form state. |
| `booking-form-top-bar.tsx` | Pinned "Checkout" title + close button. |
| `guest-info-form.tsx` | Renders the N guest blocks + inputs. |
| `cancellation-policy.tsx` | Policy text + terms checkbox. |

Reused as-is / with a prop: `SummaryHeader`, `SummaryDetailsRow`,
`SummaryCabinCard` (+ new `compact` prop), `SummaryPackageCard`,
`PipeSeparatedList`, shadcn `Input` / `Label` / `Select` / `Checkbox` /
`Button` (all already in `components/ui/`). No new card components.

## Wiring (dev)

- `lib/dev/mocks.ts`: export `BOOKING_FORM_MOCKS: BookingFormMock[]`.
- `lib/dev/dev-panel.tsx`: add a "booking form" section (mock `select` + "Apply"
  button) calling `setBookingFormFromDev`, mirroring the itinerary summary
  section.
- `components/agent-ui/booking-summary.tsx`: render
  `{bookingForm && <BookingFormModal open onOpenChange={…} data={bookingForm} />}`
  next to the existing itinerary summary modal, wiring close to
  `closeBookingForm`.

## Testing

Per `conventions/testing.md`, **only `lib/**/*.test.ts` is collected** — React
components are verified visually via the dev panel, not unit-tested. So:

- `lib/booking-form/guests.test.ts`: `makeEmptyGuests(n)` returns `n` blank
  guests; `makeEmptyGuests(0)` returns `[]`.
- `lib/agent-ui/ui-view-store.test.ts`: `setBookingFormFromDev` fills the slice;
  `closeBookingForm` clears it.
- **Everything visual** (N guest blocks, editable inputs, terms-gated Submit,
  Submit logging) is verified in the dev panel — no component test.

## Out of scope

- Payment / card fields.
- Real backend submit or a wire command (`show_booking_form`).
- Field-level validation beyond the terms gate.
- Persisting form data across open/close.
