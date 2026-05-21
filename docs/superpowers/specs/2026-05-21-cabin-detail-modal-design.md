# Cabin Detail Modal — Design Spec

**Date:** 2026-05-21
**Status:** Approved for planning
**Owner:** Alan Bruno

## Goal

Add a **cabin detail modal** that opens on top of the `cabin_selection` view. It
shows an image gallery plus the cabin's Bedroom / Bathroom / Amenities feature
lists. The modal can be opened and closed by **both the user** (clicking a card's
expand button) **and the agent** (via a UI command).

## Scope

In scope:

- Extend the `cabin_selection` view to carry an optional `detailCabinId`. The
  modal is open ⟺ `detailCabinId` is set.
- A new agent → frontend command `set_cabin_detail` that opens/closes the modal.
- A `CabinDetailModal` component (shadcn `Dialog`) with a two-column desktop
  layout, stacked on mobile.
- A `CabinDetailGallery` sub-component: main image + thumbnail strip.
- Bedroom / Bathroom / Amenities sections rendered from shared placeholder data.
- Wiring the existing `CabinCard` expand button to open the modal.
- A dev-panel mock for `cabin_selection` with the modal open.
- Tests for the reducer case.

Out of scope (deferred):

- Per-cabin unique detail content. All six cabins share one placeholder dataset.
- Per-cabin galleries. One shared gallery is reused by every cabin.
- Any CTA / "book this cabin" action. The modal is informational only.
- A `user → agent` event channel reporting that the modal was opened/closed.

## Non-goals

- No new full-screen view. A modal is an overlay on `cabin_selection`, not a
  view swap — the grid stays mounted behind it.
- No client-side fetching. Detail content is static frontend data.

## Data model

### Cabin detail content (`lib/cabins.ts`)

Detail content is shared placeholder, so it does **not** go on the per-cabin
`Cabin` type. It is a module-level constant:

```ts
export const CABIN_DETAIL = {
  gallery: [
    '/cabin-modal/1.png',
    '/cabin-modal/2.png',
    '/cabin-modal/3.png',
    '/cabin-modal/4.png',
  ],
  bedroom: [
    'King-size bed (convertible to two twin beds)',
    'King-size pillows and Superior Cotton linens',
    'Beds face forward',
  ],
  bathroom: [
    'Single vanity',
    'Glass-enclosed shower with overhead and handheld showerhead',
    'Luxurious terry robes, slippers and upscale amenities',
    '220V power',
    'Hairdryer',
  ],
  amenities: [
    'Bedside table with convenient iPad',
    'Closet with shelving and full-height hanging',
    'In-suite safe',
    'Writing desk/vanity area',
    '40" wall-mounted flat-screen HD TV',
    'Refrigerator',
    'Nespresso coffee machine',
    'Adjustable height/extendable coffee/dining table',
    'Sofa',
    'French Balcony',
  ],
} as const;
```

The modal header uses the **per-cabin** fields that already exist on `Cabin`
(`name`, `guests`, `area`, `priceFrom`, `view`). When real per-cabin detail
content arrives later, these fields migrate onto the `Cabin` type and
`CABIN_DETAIL` is retired — out of scope here.

### View type (`lib/agent-ui/ui-view-types.ts`)

```ts
| { type: 'cabin_selection'; detailCabinId?: string }
```

`detailCabinId` absent/`undefined` → modal closed. Present → modal open for that
cabin id.

### Wire command (`lib/agent-ui/commands.ts`, snake_case)

```ts
const SetCabinDetail = Base.extend({
  type: z.literal('set_cabin_detail'),
  payload: z.object({ cabin_id: z.string().nullable() }),
});
```

`cabin_id` is a string to open, `null` to close. Same nullable-payload style as
`set_booking_summary`. `SetCabinDetail` is added to the `UiCommand`
discriminated union.

## Store changes (`ui-view-store.ts`)

`applyCommand` gains a new case:

```ts
case 'set_cabin_detail':
  return {
    view: {
      type: 'cabin_selection',
      detailCabinId: cmd.payload.cabin_id ?? undefined,
    },
    hint: null,
    source: 'agent',
    lastCorrelationId: cmd.correlation_id,
  };
```

The case always sets `view` to `cabin_selection` — sending `set_cabin_detail`
from any other view navigates to cabin selection with the modal in the
requested state. This makes the command self-contained.

`setViewFromDev` and `setViewFromUser` are untouched: they already replace the
whole `view` object, so a `cabin_selection` view with or without
`detailCabinId` flows through them unchanged.

## Components

### Files

- `components/panels/cabin/cabin-detail-modal.tsx` — `CabinDetailModal`.
- `components/panels/cabin/cabin-detail-gallery.tsx` — `CabinDetailGallery`.
- Bedroom / Bathroom / Amenities sections live inline in `cabin-detail-modal.tsx`
  (a small local `DetailSection` helper) — they are three near-identical
  icon + heading + list blocks, not worth a separate file.

### `CabinDetailModal`

Props:

```ts
{ cabin: Cabin | null; onClose: () => void }
```

- Renders a shadcn `<Dialog open={cabin != null} onOpenChange={(o) => !o && onClose()}>`.
- `DialogContent` overrides the default `max-w-lg`: wide (`max-w-5xl`),
  `max-h-[90vh]`, `p-0` (gallery bleeds to the edge), `overflow-hidden`.
- Layout: two columns on `lg+` (gallery left, scrollable detail right),
  stacked and vertically scrollable below `lg`.
- Header (right column top): cabin `name` as `DialogTitle`, and an info row
  `{guests} guests · {area}m² · from {formatCabinPrice(priceFrom)} EUR · {view}`
  using the same separator style as `CabinCard`.
- The shadcn `DialogContent` close button (the built-in `X`) is the close
  affordance — matches the mockup. No extra close button.
- Below the header: three `DetailSection`s — Bedroom, Bathroom, Amenities.
  Each: a Phosphor icon + heading, a thin separator, then the feature lines
  (one per row, each with a hairline separator like the mockup).
  Icons: `BedIcon`, `BathtubIcon`, `ArmchairIcon` (or nearest Phosphor
  equivalent — final choice during implementation).
- The right column scrolls internally when content overflows `max-h-[90vh]`.

### `CabinDetailGallery`

Props: `{ images: string[]; alt: string }`.

- Local state: `activeIndex` (default `0`).
- Renders the active image large, and a horizontal thumbnail strip below.
- Clicking a thumbnail sets `activeIndex`. Active thumbnail gets a highlighted
  ring (mockup shows a purple outline; use the project accent).
- Renders whatever number of images it receives (4 here). With one image it
  renders no thumbnail strip.
- Uses `next/image`, consistent with `CabinCard`.

## Wiring (`CabinSelectionView` + `PanelCabinSelection`)

### `components/agent-ui/views/cabin-selection-view.tsx`

The registry already types this component as receiving the
`cabin_selection` view. Pass it down:

```tsx
export function CabinSelectionView({
  view,
}: {
  view: Extract<UiView, { type: 'cabin_selection' }>;
}) {
  return <PanelCabinSelection view={view} />;
}
```

### `components/panels/cabin/panel-cabin-selection.tsx`

- Accepts `view: Extract<UiView, { type: 'cabin_selection' }>` as a prop.
- Reads `setViewFromUser` via `useSetViewFromUser()`.
- `onExpand(cabin)` → `setViewFromUser({ type: 'cabin_selection', detailCabinId: cabin.id })`.
- `onClose` → `setViewFromUser({ type: 'cabin_selection' })`.
- Resolves `view.detailCabinId` to a `Cabin` with `cabins.find(...)`. If the id
  does not match any cabin (e.g. agent sent a bad id), the resolved value is
  `null` and the modal stays closed — no error surfaced.
- Renders `<CabinDetailModal cabin={resolvedCabin} onClose={...} />` after the
  grid.

The existing `console.log` TODO in `handleExpand` is replaced by the real wiring.
`CabinCard` itself is unchanged — it already exposes `onExpand`.

## Dev panel (`lib/dev/mocks.ts`)

`cabin_selection` gains a second mock so the modal can be previewed without the
agent:

```ts
cabin_selection: [
  { id: 'default', label: 'Grid', view: { type: 'cabin_selection' } },
  {
    id: 'with_detail',
    label: "Detail open (Owner's Suite)",
    view: { type: 'cabin_selection', detailCabinId: 'owners-suite' },
  },
],
```

(The current single `default` entry is kept as the first item.)

## Tests (vitest, co-located)

- `commands.test.ts`: parser accepts `set_cabin_detail` with a string
  `cabin_id` and with `null`; rejects a missing `cabin_id` and wrong types.
- `ui-view-store.test.ts`:
  - `applyCommand({ type: 'set_cabin_detail', payload: { cabin_id: 'owners-suite' } })`
    sets `view` to `{ type: 'cabin_selection', detailCabinId: 'owners-suite' }`
    and `source = 'agent'`.
  - `applyCommand` with `cabin_id: null` sets
    `view` to `{ type: 'cabin_selection' }` (no `detailCabinId`).
  - Sending `set_cabin_detail` while on a non-`cabin_selection` view switches
    the view to `cabin_selection`.

Component-level tests for the modal/gallery are out of scope for this spec
(the existing cabin components have no co-located tests); rely on the dev-panel
mock for visual verification.

## Risks / open questions

- **Phosphor icon names** — `BedIcon` / `BathtubIcon` / `ArmchairIcon` exact
  names confirmed against `@phosphor-icons/react` during implementation.
- **Mobile layout** — the mockup is desktop-first; the stacked mobile layout is
  best-effort and may need a design follow-up.
- **Gallery aspect ratio** — main image dimensions tuned during implementation
  to match the mockup's framing.

## Out of this spec (future work)

- Per-cabin detail content and galleries.
- A booking CTA inside the modal and its wiring.
- Reporting modal open/close back to the agent.
- Animations beyond the shadcn `Dialog` default open/close transition.
