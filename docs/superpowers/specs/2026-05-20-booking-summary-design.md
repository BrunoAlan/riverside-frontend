# Booking Summary — Design Spec

**Date:** 2026-05-20
**Status:** Approved for planning
**Owner:** Alan Bruno

## Goal

Add a persistent **booking summary** overlay anchored to the bottom-right of the screen that reflects the current state of a guest's booking. Every field is pushed from the agent — the frontend renders, it does not compute.

## Scope

In scope:

- A new agent → frontend command `set_booking_summary` carrying a full snapshot.
- Storing that snapshot in `uiViewStore` alongside the current view.
- A `BookingSummary` React component that renders the snapshot.
- Visibility rule: shown on every view except `start`; also hidden until the agent has pushed at least one snapshot.
- Visual placeholders for empty fields (e.g. "People", "Month") matching the mockup.
- Buttons (`Itinerary Summary`, share, save, `Continue to booking`) rendered as visuals with **no click handlers** in this iteration.

Out of scope (deferred to later tickets):

- Wiring any button to an action, navigation, or back-channel event to the agent.
- A `user → agent` event channel.
- Animations beyond a basic mount transition (TBD if added during implementation).
- i18n / currency formatting — the agent sends pre-formatted labels.

## Non-goals

- No client-side derivation of any summary field. If the agent doesn't send it, it doesn't show. Frontend never computes price, duration, or stop counts.
- No partial patches. Each command carries the full snapshot.

## Data model

### Wire format (`commands.ts`, snake_case)

```ts
const BookingSummarySnapshot = z.object({
  people:      z.object({ label: z.string() }).nullable(),
  month:       z.object({ label: z.string() }).nullable(),
  embarkation: z.object({ label: z.string() }).nullable(),
  stops:       z.object({ primary: z.string(), extra: z.number().int().min(0) }).nullable(),
  duration:    z.object({ label: z.string() }).nullable(),
  price:       z.object({ label: z.string() }).nullable(),
  slots: z.array(z.object({
    label: z.string(),
    state: z.enum(['active', 'filled', 'empty']),
  })).max(6),
  cta: z.object({ label: z.string(), enabled: z.boolean() }),
});

const SetBookingSummary = Base.extend({
  type: z.literal('set_booking_summary'),
  payload: BookingSummarySnapshot,
});
```

`SetBookingSummary` is added to the `UiCommand` discriminated union.

Field semantics:

| Field         | `null` means                                  |
| ------------- | --------------------------------------------- |
| `people`      | show placeholder chip "People"                |
| `month`       | show placeholder chip "Month"                 |
| `embarkation` | show placeholder chip "Embark"                |
| `stops`       | show placeholder chip "Stops"                 |
| `duration`    | show placeholder chip "Days"                  |
| `price`       | show placeholder chip "Price"                 |

Placeholders are rendered in a muted style (the dotted-outline look from the mockup's "Empty slot" chips, scaled to the info row).

`slots`: zero or more (capped at 6). Empty array renders no slot row.
`cta.enabled = false` renders the CTA visually disabled.

### Internal type (`ui-view-types.ts`, camelCase)

Mirrors the wire shape one-to-one (no key renames needed — fields are already plain). Exported as `BookingSummary`.

```ts
export type BookingSummary = {
  people: { label: string } | null;
  month: { label: string } | null;
  embarkation: { label: string } | null;
  stops: { primary: string; extra: number } | null;
  duration: { label: string } | null;
  price: { label: string } | null;
  slots: Array<{ label: string; state: 'active' | 'filled' | 'empty' }>;
  cta: { label: string; enabled: boolean };
};
```

## Store changes (`ui-view-store.ts`)

Add a new field to `UiViewState`:

```ts
bookingSummary: BookingSummary | null;  // null until first snapshot arrives
```

Initial value: `null`.

`applyCommand` gains a new case:

```ts
case 'set_booking_summary':
  return {
    bookingSummary: cmd.payload,
    source: 'agent',
    lastCorrelationId: cmd.correlation_id,
  };
```

This case **does not** touch `view` or `hint` — the snapshot is orthogonal to navigation.

`setViewFromDev` and `setViewFromUser` are left untouched: changing the active view does not clear the booking summary. The dev panel gets a separate setter for previewing summary states:

```ts
setBookingSummaryFromDev: (summary: BookingSummary | null) => void;
```

It sets `bookingSummary` and `source = 'dev'`. Used only by the dev panel.

## Component

### Files

- `components/agent-ui/booking-summary.tsx` — exports:
  - `BookingSummary` (pure): props `{ summary: BookingSummaryType }`. Renders the panel.
  - `BookingSummaryContainer` (default export): reads `view` and `bookingSummary` from the store, decides whether to render.

### Visibility rule (container)

```ts
if (view.type === 'start') return null;
if (bookingSummary === null) return null;
return <BookingSummary summary={bookingSummary} />;
```

### Layout

Following the mockup (image #3):

- Fixed positioning: `fixed bottom-6 right-6 z-50`. On small screens, falls back to `bottom-4 left-4 right-4` so it stays usable. (Exact breakpoints decided during implementation.)
- Container: rounded card, `bg-card/95 backdrop-blur`, subtle border + shadow, matching the Riverside neutral palette already defined in `app-config.ts`.
- Two-row stack:
  - **Row 1** — info chips (icon + label) left-aligned: People · Month · Embark (📍) · Stops (📖 "Bratislava +3") · Days · Price. Right-aligned: "Itinerary Summary" pill button.
  - **Row 2** — slot pills left-aligned (active = filled, filled = solid, empty = dashed outline). Right-aligned: share icon, save icon, CTA button.

Icons come from `lucide-react` (already used by shadcn UI).

### Buttons

All four (`Itinerary Summary`, share, save, `Continue to booking`) render as visuals only — no `onClick` handlers. The CTA respects `cta.enabled`: when `false`, it gets the shadcn `Button` `disabled` state; when `true`, it's enabled visually but still has no handler. Out of scope for this ticket: wiring any of them.

## Integration

- Mount `BookingSummaryContainer` once in the root layout (likely `app/layout.tsx` or whichever component currently wraps `ContentView`; confirmed during implementation).
- Rendered as a sibling of `ContentView`, not a child. The component owns its own fixed positioning and z-index.
- No prop drilling; the container subscribes to the store directly.

## Dev panel

`lib/dev/mocks.ts` gains a `BOOKING_SUMMARY_MOCKS` map with at least:

- `empty` — all nullable fields `null`, no slots, CTA disabled.
- `partial` — people + month + embarkation filled, rest null, one active slot, CTA disabled.
- `full` — every field filled, three slots `[active, empty, empty]`, CTA enabled. Matches the mockup.
- `clear` — sentinel that calls `setBookingSummaryFromDev(null)` to reset.

The dev panel gets a new section to pick one of these.

## Tests (vitest, co-located)

- `commands.test.ts`: parser accepts a valid snapshot, rejects extra fields / wrong types / out-of-range `stops.extra` / >6 slots / unknown slot `state`.
- `ui-view-store.test.ts`:
  - `applyCommand({type:'set_booking_summary', ...})` sets `bookingSummary` and `source = 'agent'`.
  - A subsequent `show_dream_stage` (or any other view command) **does not** clear `bookingSummary`.
  - `setViewFromDev` and `setViewFromUser` do not touch `bookingSummary`.
  - `setBookingSummaryFromDev(null)` clears it.
- `booking-summary.test.tsx`:
  - Renders all chips when every field is provided.
  - Renders placeholder chips when fields are `null`.
  - Renders each slot state with the right variant.
  - CTA reflects `cta.enabled`.
  - Buttons render but carry no `onClick` (negative assertion or just absence).
- Container test:
  - Returns `null` when `view.type === 'start'`.
  - Returns `null` when `bookingSummary === null`.
  - Renders `<BookingSummary />` otherwise.

## Risks / open questions

- **Root layout integration point** — needs confirmation when implementing (whether `app/layout.tsx` is server-rendered and where the client provider currently lives).
- **Small-screen layout** — the mockup is desktop-first; the responsive fallback is a best-effort that may need a follow-up pass with design.
- **Dev panel API** — the exact UI for picking a mock will follow whatever pattern the existing dev panel uses for views (TBD by inspection during implementation, not a design decision).

## Out of this spec (future work)

- Wiring CTA and icons to real actions.
- Defining a `user → agent` event channel so clicks can be reported.
- Animations on summary updates (chip diff highlight, slot transitions).
- Telemetry on agent-driven snapshot frequency.
