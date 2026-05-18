# Cabin Selection Panel — Design

**Date:** 2026-05-17
**Status:** Approved

## Goal

Add a new content panel, `CabinSelection`, that displays the available
cruise cabins (suites) as a responsive card grid. The panel joins the
existing switchable content panels and is selectable from the panel
dropdown in `ContentView`.

## Scope

In scope:

- A `cabins` data module with the 6 suites from the mockup.
- A `CabinCard` presentational component.
- A `PanelCabinSelection` panel that renders the grid.
- Registration in the content-panel registry.

Out of scope (handled elsewhere or later):

- The bottom itinerary summary bar (people, dates, itinerary chips,
  "Continue to booking").
- The bottom-left voice input and settings cog.
- The expand-icon behavior — stubbed as a no-op for now, matching
  `CityCard`.

## Architecture

Mirrors the existing `CityCard` + `lib/map/cities.ts` + `PanelMap`
pattern so the new code is consistent with the codebase.

### 1. `lib/cabins.ts`

Data module. Exports:

```ts
export type Cabin = {
  id: string;
  name: string;
  image: string;     // e.g. '/cabins/owners-suite.jpg'
  guests: number;
  area: number;      // square metres
  priceFrom: number; // EUR
  view: string;      // e.g. 'Balcony'
};

export const cabins: Cabin[];
```

The `cabins` array contains 6 entries: Owner's Suite, Mozart Suite,
Penthouse Suite, Riverside Suite, Symphony Suite, Harmony Suite. Per the
mockup all six share `guests: 2`, `area: 80`, `priceFrom: 12229`,
`view: 'Balcony'`. Each `image` points to `/cabins/{id}.jpg` under
`public/cabins/` (images to be added separately).

### 2. `components/app/content-panels/cabin-card.tsx`

`CabinCard` presentational component. Props:

```ts
type CabinCardProps = {
  cabin: Cabin;
  interactive?: boolean;        // default true
  onExpand?: (cabin: Cabin) => void;
};
```

Layout (top to bottom), built from existing `Card`, `Button`, and the
phosphor `ArrowsOutSimpleIcon`:

- Rounded `next/image` cover photo.
- A row with the cabin `name` (large, semibold) and a secondary
  icon-button carrying `ArrowsOutSimpleIcon`. The button calls
  `onExpand?.(cabin)` and is rendered only when `interactive` is true.
- An info row: `{guests} guests`, `{area}m²`, `from {priceFrom} EUR`,
  `{view}` — separated by thin vertical dividers, muted text. Price
  formatted with thousands separators (`12,229`).

### 3. `components/app/content-panels/panel-cabin-selection.tsx`

`PanelCabinSelection` panel component.

- Beige background (`bg-beige-200`), full height, vertically scrollable.
- Inner container is a responsive CSS grid: 1 column on mobile,
  2 columns at `sm`, 3 columns at `lg`, with consistent gap and padding.
- Maps `cabins` to `CabinCard`. `onExpand` is a no-op stub
  (`console.log` + TODO comment), matching `CompareItinerary`'s handling
  of `CityCard.onExpand`.

### 4. `components/app/content-panels/registry.ts`

Append one entry:

```ts
{ id: 'cabins', label: 'Cabinas', component: PanelCabinSelection }
```

## Data Flow

`cabins` (static) → `PanelCabinSelection` maps over the array →
one `CabinCard` per cabin. No async loading, no client state. The panel
can be a server component; `'use client'` is unnecessary unless the
no-op `onExpand` handler requires it — it does (event handler passed to
a client child), so the panel file carries `'use client'`.

## Error Handling

Static data, no fetching — no runtime error states. Missing card images
degrade to `next/image`'s default broken-image behavior; acceptable
until real assets land.

## Testing

- Unit test (`vitest`) for `CabinCard`: renders cabin name, formatted
  price, and info-row fields; expand button present when `interactive`,
  absent when not; `onExpand` fires with the cabin on click.
- Unit test for `PanelCabinSelection`: renders one card per entry in
  `cabins`.
