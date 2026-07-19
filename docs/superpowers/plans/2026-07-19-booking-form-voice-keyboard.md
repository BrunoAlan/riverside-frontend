# Booking form by voice + keyboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The booking form becomes agent-operable end to end: the agent opens it (`show_booking_form`), voice-dictated data fills it visibly (`update_booking_form`), keyboard edits sync to the agent per completed field (`provide_guest_info` intent), submit sends the full snapshot (`submit_booking_form` intent) and waits for the backend to resolve (`close_booking_form`), and the "Continue to booking" CTA finally sends its intent (`continue_booking`).

**Architecture:** Guest data and agreement state lift from the modal's local `useState` into the `bookingForm` store slice (the `activeTab` lesson: commands can only touch the store). Three new Zod commands mutate the slice; components emit intents on user actions only — agent-driven store writes never re-emit (the anti-echo rule from the tab work). Consent (`agreed`) is deliberately NOT settable by command.

**Tech Stack:** Zod discriminated union, Zustand, existing `useFrontendIntent` hook, existing `toItinerarySummary` converter.

**Approved decisions:** voice fills the form visibly via command; keyboard syncs per completed field (blur with changes; select on change); submit leaves the modal open in `submitting` state until `close_booking_form` arrives (the X stays usable as escape).

## Global Constraints

- Package manager is `pnpm` — never `npm` or `yarn`.
- Never edit `components/ui/` (shadcn primitives).
- eslint and vitest do NOT typecheck: run `pnpm exec tsc --noEmit` separately; must be clean at each task's commit **except** Task 2, which intentionally leaves the store's exhaustiveness check failing until Task 3 adds the cases (same sequence as the show_suggestions work).
- Branch: `feat/agent-suggestions-command-drift` (continue on it).
- Tests live next to the code they cover. Run one file with `pnpm test <path>`.
- No browser testing (user verifies visually themselves).
- Wire naming is snake_case (`first_name`, `guest_count`); store/TS naming is camelCase (`firstName`, `guestCount`).

---

### Task 1: booking-form model — factory, country codes, mock updates

**Files:**
- Modify: `lib/booking-form/types.ts`
- Modify: `lib/booking-form/guests.ts`
- Modify: `lib/booking-form/mock.ts`
- Modify: `lib/dev/mocks.ts:645-653` (`BOOKING_FORM_MOCKS`)
- Modify: `components/panels/booking-form/guest-info-form.tsx:13` (import `COUNTRY_CODES` instead of declaring it)
- Test: `lib/booking-form/guests.test.ts`

**Interfaces:**
- Produces:
  - `BookingForm = { summary: ItinerarySummary; guestCount: number; guests: GuestInfo[]; agreed: boolean; status: 'editing' | 'submitting' }`
  - `makeBookingForm(summary: ItinerarySummary, guestCount: number): BookingForm` — clamps `guestCount` to ≥ 1 and seeds empty guests. Exported from `lib/booking-form/guests.ts`.
  - `COUNTRY_CODES: readonly ['US', 'GB', 'DE', 'FR', 'ES']` exported from `lib/booking-form/guests.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/booking-form/guests.test.ts`:

```ts
describe('makeBookingForm', () => {
  it('seeds an editing form with empty guests', () => {
    const summary = {} as import('@/lib/itinerary-summary/types').ItinerarySummary;
    const form = makeBookingForm(summary, 2);
    expect(form.guestCount).toBe(2);
    expect(form.guests).toHaveLength(2);
    expect(form.guests[0]).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: 'US',
      phone: '',
    });
    expect(form.agreed).toBe(false);
    expect(form.status).toBe('editing');
  });

  it('clamps guest_count to at least 1', () => {
    const summary = {} as import('@/lib/itinerary-summary/types').ItinerarySummary;
    expect(makeBookingForm(summary, 0).guests).toHaveLength(1);
    expect(makeBookingForm(summary, -3).guestCount).toBe(1);
  });
});
```

(Adjust the import of `makeBookingForm` at the top of the file: `import { makeBookingForm, makeEmptyGuests } from './guests';` — match the file's existing import style.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test lib/booking-form/guests.test.ts`
Expected: FAIL — `makeBookingForm` is not exported.

- [ ] **Step 3: Implement the model**

`lib/booking-form/types.ts` — replace the whole file:

```ts
import type { GuestInfo } from '@/lib/booking-form/guests';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

// The booking form reuses the itinerary data verbatim. Guest data and consent
// live here (not in component state) so ui-commands can write them.
export type BookingForm = {
  summary: ItinerarySummary;
  guestCount: number;
  guests: GuestInfo[];
  // Consent is only ever set by a user tap — no command touches it.
  agreed: boolean;
  // 'submitting' = snapshot sent via submit_booking_form; resolved by the
  // close_booking_form command (the X stays usable as an escape hatch).
  status: 'editing' | 'submitting';
};
```

`lib/booking-form/guests.ts` — append (type-only circular import with types.ts is fine, it erases at compile time):

```ts
import type { BookingForm } from '@/lib/booking-form/types';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

/** The only codes the phone country select can render. */
export const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'ES'] as const;

export function makeBookingForm(summary: ItinerarySummary, guestCount: number): BookingForm {
  const count = Math.max(1, guestCount);
  return {
    summary,
    guestCount: count,
    guests: makeEmptyGuests(count),
    agreed: false,
    status: 'editing',
  };
}
```

`lib/booking-form/mock.ts` — the mock becomes:

```ts
import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
import { makeBookingForm } from './guests';
import type { BookingForm } from './types';

// Reuse the itinerary summary data verbatim — the checkout recap is the same
// destination / cabin / package the guest just configured.
export const BOOKING_FORM_MOCK: BookingForm = makeBookingForm(ITINERARY_SUMMARY_MOCK, 2);
```

`lib/dev/mocks.ts:651` — the inline `single_empty` form becomes a factory call (add `makeBookingForm` to the imports from `@/lib/booking-form/guests`):

```ts
  {
    id: 'single_empty',
    label: '1 guest, empty summary',
    form: makeBookingForm(EMPTY_ITINERARY_SUMMARY, 1),
  },
```

`components/panels/booking-form/guest-info-form.tsx` — delete the local `const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'ES'] as const;` (line 13) and import it from `@/lib/booking-form/guests` instead.

- [ ] **Step 4: Verify**

Run: `pnpm test lib/booking-form/ && pnpm exec tsc --noEmit`
Expected: guests tests PASS; tsc clean (`BookingFormModal` still compiles: it only reads `data.summary` and `data.guestCount`, both still present).

- [ ] **Step 5: Commit**

```bash
git add lib/booking-form/ lib/dev/mocks.ts components/panels/booking-form/guest-info-form.tsx
git commit -m "feat(booking-form): store-shaped model with factory and shared country codes"
```

---

### Task 2: command schemas — show/update/close_booking_form

**Files:**
- Modify: `lib/agent-ui/commands.ts` (three new commands + union entries)
- Test: `lib/agent-ui/commands.test.ts`

**Interfaces:**
- Produces three `UiCommand` members Task 3 consumes:
  - `show_booking_form` payload `{ summary: ItinerarySummaryWire, guest_count: number }`
  - `update_booking_form` payload `{ guests: Array<{ index: number; first_name?; last_name?; email?; country_code?; phone? }> }` (all patch fields strings, optional; NO `agreed` field — consent is user-only)
  - `close_booking_form` payload `{}` optional

**NOTE:** after this task `pnpm exec tsc --noEmit` FAILS on ui-view-store.ts's exhaustive `default` until Task 3 lands. Expected; do not touch ui-view-store.ts here.

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/commands.test.ts`:

```ts
describe('booking form commands', () => {
  it('parses show_booking_form with a summary wire and guest_count', () => {
    const result = UiCommand.parse({
      type: 'show_booking_form',
      correlationId: 'bf1',
      payload: {
        summary: {
          header: { title: null, subtitle: null, image: null },
          details: {
            guests: null,
            month: null,
            embarkation: null,
            stops: null,
            dates: null,
            price_per_person: '$5,000',
            cabin_name: null,
          },
          cabin: null,
          package: { price_per_person: '$5,000', name: null, inclusions: [] },
          itinerary: null,
          total: '$10,000',
        },
        guest_count: 2,
      },
    });
    if (result.type !== 'show_booking_form') throw new Error('discriminator failed');
    expect(result.payload.guest_count).toBe(2);
  });

  it('parses update_booking_form with partial guest patches', () => {
    const result = UiCommand.parse({
      type: 'update_booking_form',
      correlationId: 'bf2',
      payload: {
        guests: [
          { index: 0, first_name: 'Juan', last_name: 'Pérez' },
          { index: 1, email: 'ana@example.com' },
        ],
      },
    });
    if (result.type !== 'update_booking_form') throw new Error('discriminator failed');
    expect(result.payload.guests).toHaveLength(2);
    expect(result.payload.guests[0].first_name).toBe('Juan');
    expect(result.payload.guests[1].phone).toBeUndefined();
  });

  it('rejects an update_booking_form guest patch without index', () => {
    const result = UiCommand.safeParse({
      type: 'update_booking_form',
      correlationId: 'bf3',
      payload: { guests: [{ first_name: 'Juan' }] },
    });
    expect(result.success).toBe(false);
  });

  it('parses close_booking_form without payload', () => {
    const result = UiCommand.parse({
      type: 'close_booking_form',
      correlationId: 'bf4',
    });
    expect(result.type).toBe('close_booking_form');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: FAIL — the three types are not in the union.

- [ ] **Step 3: Add the schemas**

`lib/agent-ui/commands.ts` — after `ShowSuggestions`:

```ts
const ShowBookingForm = Base.extend({
  type: z.literal('show_booking_form'),
  // Same wire as show_itinerary_summary plus how many guest blocks to render.
  // guest_count is not floored here — the reducer clamps to >= 1; the parser
  // never drops a command over odd content.
  payload: z.object({
    summary: ItinerarySummaryWire,
    guest_count: z.number().int(),
  }),
});

const UpdateBookingForm = Base.extend({
  type: z.literal('update_booking_form'),
  // Voice-dictated data filling the form visibly. Deliberately NO `agreed`
  // field: the cancellation-policy consent is only ever a user tap.
  payload: z.object({
    guests: z.array(
      z.object({
        index: z.number().int(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        country_code: z.string().optional(),
        phone: z.string().optional(),
      })
    ),
  }),
});

const CloseBookingForm = Base.extend({
  type: z.literal('close_booking_form'),
  payload: z.object({}).optional(),
});
```

Add `ShowBookingForm,`, `UpdateBookingForm,`, `CloseBookingForm,` to the `UiCommand` union array.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: PASS. (`tsc` now fails on the store's exhaustiveness — expected, Task 3 fixes it.)

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add show/update/close_booking_form schemas"
```

---

### Task 3: store — booking form cases and user actions

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: the three commands from Task 2; `makeBookingForm`, `COUNTRY_CODES`, `GuestInfo` from `@/lib/booking-form/guests`; `toItinerarySummary` (already imported).
- Produces:
  - Reducer cases for the three commands (behavior specified below).
  - Actions `updateGuestFromUser(index: number, patch: Partial<GuestInfo>): void`, `setAgreedFromUser(agreed: boolean): void`, `submitBookingFormFromUser(): void` (sets `status: 'submitting'`).
  - Hooks `useUpdateGuestFromUser()`, `useSetAgreedFromUser()`, `useSubmitBookingFormFromUser()`.
- This task restores `pnpm exec tsc --noEmit` to clean.

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/ui-view-store.test.ts` (inside the top-level describe):

```ts
  describe('booking form', () => {
    const summaryWire = {
      header: { title: 'Danube', subtitle: null, image: null },
      details: {
        guests: '2 People',
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: '$5,000',
        cabin_name: null,
      },
      cabin: null,
      package: { price_per_person: '$5,000', name: null, inclusions: [] },
      itinerary: null,
      total: '$10,000',
    };

    const openForm = (guestCount = 2) =>
      store.getState().applyCommand({
        type: 'show_booking_form',
        correlationId: 'bf1',
        payload: { summary: summaryWire, guest_count: guestCount },
      });

    it('show_booking_form opens an editing form with empty guests', () => {
      openForm(2);
      const form = store.getState().bookingForm;
      expect(form?.guests).toHaveLength(2);
      expect(form?.agreed).toBe(false);
      expect(form?.status).toBe('editing');
      expect(store.getState().source).toBe('agent');
    });

    it('show_booking_form clamps guest_count to at least 1', () => {
      openForm(0);
      expect(store.getState().bookingForm?.guests).toHaveLength(1);
    });

    it('update_booking_form patches only the named fields', () => {
      openForm(2);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf2',
        payload: { guests: [{ index: 0, first_name: 'Juan', email: 'juan@example.com' }] },
      });
      const guests = store.getState().bookingForm?.guests;
      expect(guests?.[0]).toMatchObject({
        firstName: 'Juan',
        email: 'juan@example.com',
        lastName: '',
      });
      expect(guests?.[1].firstName).toBe('');
    });

    it('update_booking_form ignores out-of-range indices and unknown country codes', () => {
      openForm(1);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf3',
        payload: {
          guests: [
            { index: 5, first_name: 'Nadie' },
            { index: 0, country_code: 'XX', phone: '123' },
          ],
        },
      });
      const guests = store.getState().bookingForm?.guests;
      expect(guests).toHaveLength(1);
      expect(guests?.[0].countryCode).toBe('US');
      expect(guests?.[0].phone).toBe('123');
    });

    it('update_booking_form without an open form only tags the correlation', () => {
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf4',
        payload: { guests: [{ index: 0, first_name: 'Juan' }] },
      });
      expect(store.getState().bookingForm).toBeNull();
      expect(store.getState().lastCorrelationId).toBe('bf4');
    });

    it('no command can set agreed', () => {
      openForm(1);
      store.getState().setAgreedFromUser(true);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf5',
        payload: { guests: [{ index: 0, first_name: 'Juan' }] },
      });
      expect(store.getState().bookingForm?.agreed).toBe(true);
    });

    it('user actions edit guests, consent, and submit status', () => {
      openForm(1);
      store.getState().updateGuestFromUser(0, { firstName: 'Ana' });
      store.getState().setAgreedFromUser(true);
      store.getState().submitBookingFormFromUser();
      const form = store.getState().bookingForm;
      expect(form?.guests[0].firstName).toBe('Ana');
      expect(form?.agreed).toBe(true);
      expect(form?.status).toBe('submitting');
      expect(store.getState().source).toBe('user');
    });

    it('close_booking_form clears the slice', () => {
      openForm(1);
      store.getState().submitBookingFormFromUser();
      store.getState().applyCommand({ type: 'close_booking_form', correlationId: 'bf6' });
      expect(store.getState().bookingForm).toBeNull();
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — cases and actions missing.

- [ ] **Step 3: Implement**

`lib/agent-ui/ui-view-store.ts`:

1. Add imports:

```ts
import { COUNTRY_CODES, type GuestInfo, makeBookingForm } from '@/lib/booking-form/guests';
```

2. Extend `UiViewState`:

```ts
  updateGuestFromUser: (index: number, patch: Partial<GuestInfo>) => void;
  setAgreedFromUser: (agreed: boolean) => void;
  submitBookingFormFromUser: () => void;
```

3. New reducer cases (before `default`):

```ts
                case 'show_booking_form':
                  return {
                    bookingForm: makeBookingForm(
                      toItinerarySummary(cmd.payload.summary),
                      cmd.payload.guest_count
                    ),
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'update_booking_form': {
                  if (!state.bookingForm) {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  const guests = [...state.bookingForm.guests];
                  for (const patch of cmd.payload.guests) {
                    const current = guests[patch.index];
                    // Out-of-range indices are ignored, not an error.
                    if (!current) continue;
                    guests[patch.index] = {
                      firstName: patch.first_name ?? current.firstName,
                      lastName: patch.last_name ?? current.lastName,
                      email: patch.email ?? current.email,
                      // Only codes the phone select can render.
                      countryCode: (COUNTRY_CODES as readonly string[]).includes(
                        patch.country_code ?? ''
                      )
                        ? (patch.country_code as string)
                        : current.countryCode,
                      phone: patch.phone ?? current.phone,
                    };
                  }
                  // `agreed` is never touched here: consent is user-only.
                  return {
                    bookingForm: { ...state.bookingForm, guests },
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'close_booking_form':
                  return {
                    bookingForm: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
```

4. New actions next to `setBookingFormFromDev`:

```ts
        updateGuestFromUser: (index, patch) =>
          set(
            (state) =>
              state.bookingForm?.guests[index]
                ? {
                    bookingForm: {
                      ...state.bookingForm,
                      guests: state.bookingForm.guests.map((g, i) =>
                        i === index ? { ...g, ...patch } : g
                      ),
                    },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'updateGuestFromUser'
          ),

        setAgreedFromUser: (agreed) =>
          set(
            (state) =>
              state.bookingForm
                ? {
                    bookingForm: { ...state.bookingForm, agreed },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'setAgreedFromUser'
          ),

        submitBookingFormFromUser: () =>
          set(
            (state) =>
              state.bookingForm
                ? {
                    bookingForm: { ...state.bookingForm, status: 'submitting' },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'submitBookingFormFromUser'
          ),
```

`lib/agent-ui/hooks.ts` — add:

```ts
export const useUpdateGuestFromUser = () => useUiViewStore((s) => s.updateGuestFromUser);
export const useSetAgreedFromUser = () => useUiViewStore((s) => s.setAgreedFromUser);
export const useSubmitBookingFormFromUser = () =>
  useUiViewStore((s) => s.submitBookingFormFromUser);
```

- [ ] **Step 4: Verify**

Run: `pnpm test lib/agent-ui/ && pnpm exec tsc --noEmit`
Expected: all PASS, tsc clean again.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts lib/agent-ui/hooks.ts
git commit -m "feat(booking-form): store-driven guests, consent, and submit lifecycle"
```

---

### Task 4: components — store-driven modal, field-commit intents, submit, CTA

**Files:**
- Modify: `components/panels/booking-form/booking-form-modal.tsx`
- Modify: `components/panels/booking-form/guest-info-form.tsx`
- Modify: `lib/booking-form/copy.ts` (add `submitting` label)
- Modify: `components/agent-ui/booking-summary.tsx:146` (CTA onClick)

**Interfaces:**
- Consumes: hooks from Task 3, `useFrontendIntent`, `BookingForm` shape from Task 1.
- Produces intents on the wire (snake_case entities):
  - `continue_booking` — `{}`, `userMessage: 'User tapped Continue to booking'`
  - `provide_guest_info` — `entities: { guest_index, field, value }` where `field` is one of `first_name | last_name | email | country_code | phone`
  - `submit_booking_form` — `entities: { guests: [{ first_name, last_name, email, country_code, phone }], agreed: true }`, `userMessage: 'User submitted the booking form'`

No component tests (repo has none). Verification: lint + tsc + suite.

- [ ] **Step 1: GuestInfoForm — commit callback with a dirty guard**

`components/panels/booking-form/guest-info-form.tsx` gets one new prop and internal dirty-tracking so a blur only commits fields the USER changed (agent writes via `update_booking_form` re-render the inputs but never mark them dirty — that is the anti-echo guarantee):

```tsx
export type GuestField = 'first_name' | 'last_name' | 'email' | 'country_code' | 'phone';

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
  // Fields touched by the keyboard since their last commit. Agent-driven
  // updates re-render values but never mark dirty, so they never re-emit.
  const dirty = useRef(new Set<string>());
  const markDirty = (i: number, field: GuestField) => dirty.current.add(`${i}.${field}`);
  const commitIfDirty = (i: number, field: GuestField, value: string) => {
    if (!dirty.current.delete(`${i}.${field}`)) return;
    onCommit(i, field, value);
  };
  ...
```

Each text `Input` gains a mark + a blur commit (shown for `firstName`; `lastName`, `email`, `phone` are identical with their own field names):

```tsx
            <Input
              value={guest.firstName}
              onChange={(e) => {
                markDirty(i, 'first_name');
                onChange(i, { firstName: e.target.value });
              }}
              onBlur={(e) => commitIfDirty(i, 'first_name', e.target.value)}
            />
```

The country `Select` commits on change directly (a pick IS the completed edit):

```tsx
              <Select
                value={guest.countryCode}
                onValueChange={(v) => {
                  onChange(i, { countryCode: v });
                  onCommit(i, 'country_code', v);
                }}
              >
```

Add `import { useRef } from 'react';` at the top.

- [ ] **Step 2: BookingFormModal — store-driven, no local state**

`components/panels/booking-form/booking-form-modal.tsx`:

1. Remove the local state and handlers (`useState` for `guests`/`agreed`, `updateGuest`, `handleSubmit` with its `console.log`) and the now-unused `useState`/`makeEmptyGuests`/`GuestInfo` imports.
2. The component reads everything from `data` and receives callbacks:

```tsx
type BookingFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BookingForm;
  onGuestChange: (index: number, patch: Partial<GuestInfo>) => void;
  onGuestCommit: (index: number, field: GuestField, value: string) => void;
  onAgreedChange: (agreed: boolean) => void;
  onSubmit: () => void;
};
```

The right column becomes:

```tsx
                <div className="flex flex-col gap-8">
                  <GuestInfoForm
                    guests={data.guests}
                    onChange={onGuestChange}
                    onCommit={onGuestCommit}
                  />
                  <CancellationPolicy agreed={data.agreed} onAgreedChange={onAgreedChange} />
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
```

3. The container wires store + intents (replace the whole `BookingFormModalContainer`; drop the `key={bookingForm.guestCount}` remount hack — the store is the source of truth now):

```tsx
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
        if (!o) closeBookingForm();
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
        void sendIntent('submit_booking_form', {
          entities: {
            guests: bookingForm.guests.map((g) => ({
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
```

Update imports accordingly (`useFrontendIntent`, the three new hooks, `GuestField` + `GuestInfo` types).

- [ ] **Step 3: Copy + CTA**

`lib/booking-form/copy.ts` — after `submit: 'Submit',` add:

```ts
  submitting: 'Sending…',
```

`components/agent-ui/booking-summary.tsx:146` — the CTA gains its intent:

```tsx
          <Button
            disabled={!summary.cta.enabled}
            onClick={() =>
              void sendIntent('continue_booking', {
                userMessage: 'User tapped Continue to booking',
              })
            }
          >
            {summary.cta.label}
          </Button>
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm test && pnpm exec tsc --noEmit`
Expected: all clean/green.

- [ ] **Step 5: Commit**

```bash
git add components/panels/booking-form/ lib/booking-form/copy.ts components/agent-ui/booking-summary.tsx
git commit -m "feat(booking-form): voice-fillable store-driven form with field and submit intents"
```

---

### Task 5: contract doc — booking form section

**Files:**
- Modify: `docs/2026-07-19-agent-ui-backend-requests.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Inventory updates**

Add three rows to the commands table (after the `show_suggestions` row):

```markdown
| `show_booking_form` | `{ summary: <mismo wire que show_itinerary_summary>, guest_count }` — ver pedido 2.11 |
| `update_booking_form` | `{ guests: [{ index, first_name?, last_name?, email?, country_code?, phone? }] }` — ver pedido 2.11 |
| `close_booking_form` | `{}` — ver pedido 2.11 |
```

Add to the intents section, after the "Cabinas" list:

```markdown
Booking form, ya emitidos hoy:

- `continue_booking` — el usuario tocó "Continue to booking" en la booking summary.
- `provide_guest_info` — el usuario completó un campo por teclado.
  `entities: { guest_index, field, value }`, con `field` ∈ `first_name | last_name |
  email | country_code | phone`.
- `submit_booking_form` — el usuario envió el form.
  `entities: { guests: [{ first_name, last_name, email, country_code, phone }], agreed: true }`.
```

- [ ] **Step 2: Request section**

Append after section 2.10:

```markdown
### 2.11 Booking form: abrirlo, llenarlo por voz y cerrarlo

El form de checkout (datos de huéspedes) ya es operable por command del lado del
front. La cadena completa que pedimos:

1. **Habilitar el CTA.** `cta.enabled` de `set_booking_summary` depende de
   `canBook`/`bookingContextComplete`, flags que hoy nada escribe — el botón está
   permanentemente deshabilitado. Lo mismo con el guard de `continue_booking`
   (`availabilityConfirmed`). Definan quién escribe esos flags.
2. **`continue_booking` emite `show_booking_form`.** El handler hoy es un stub.
   El frontend ya manda el intent al tocar el CTA; respondan con el command
   (payload arriba: el mismo builder del summary + `guest_count` de
   `traveler_profile.traveler_count`).
3. **Dictado por voz → `update_booking_form`.** Cuando el usuario dicta datos
   ("mi nombre es Juan Pérez"), extraigan los campos y emitan el command con
   patches parciales por huésped (`index` basado en 0). El frontend los pinta en
   el form a la vista. Índices fuera de rango y `country_code` no soportados se
   ignoran. **`agreed` no existe en el payload a propósito**: el consentimiento
   de la política de cancelación solo lo marca el usuario con un tap — no lo
   intenten setear.
4. **Teclado → `provide_guest_info`.** Cada campo que el usuario completa
   tipeando les llega como intent (payload arriba). Con eso el agente sabe qué
   falta y puede guiar ("te falta el mail del huésped 2").
5. **Submit → `submit_booking_form` → `close_booking_form`.** Al enviar, el
   frontend manda el snapshot completo y deja el modal en estado "Sending…"
   hasta que ustedes respondan `close_booking_form` (la X sigue activa como
   escape). Validen y confirmen por voz; si más adelante quieren una vista de
   confirmación (`show_confirmation_summary` ya existe en su código), definimos
   el payload juntos y la sumamos.
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm lint && pnpm exec tsc --noEmit` (doc-only; confirm untouched).

```bash
git add docs/2026-07-19-agent-ui-backend-requests.md
git commit -m "docs(contract): booking form contract — open, voice-fill, sync, submit"
```
