# Itinerary Summary Modal — Design

**Date:** 2026-06-03
**Status:** Approved design, pending implementation plan
**Scope:** UI-only, fully mocked data. No agent/store wiring.

## Goal

Wire the existing **"Itinerary Summary"** button in the booking summary bar so it opens a
full-screen modal that presents the complete trip summary: header image, booking details,
selected cabin, day-by-day itinerary, selected package, and a total with CTAs. Everything is
driven by a single typed mock for now; swapping in an agent payload later should be a data change,
not a structural one.

## Non-goals (this pass)

- Agent/`uiViewStore` wiring or a new `UiView` type / command.
- Real behavior for Share, Save, "Change package", and the two CTAs (`Talk to a Riverside
  Specialist`, `Continue to booking`). They render but are inert.
- Real "More information" expansion content per city (static toggle only).
- Persisting selection or reading the live booking summary store (modal uses its own self-contained
  mock).

## Existing pieces reused

| Piece | Path |
| --- | --- |
| Trigger button (no handler yet) | `components/agent-ui/booking-summary.tsx:111` |
| Portaled full-viewport dialog | `components/ui/dialog.tsx` (shadcn) |
| Cabin gallery | `components/panels/cabin/cabin-detail-gallery.tsx` |
| Cabin detail list section | `components/panels/cabin/cabin-detail-modal.tsx` (`DetailSection`) |
| Cabin / itinerary types | `lib/agent-ui/commands.ts` (`Cabin`, `ItineraryCity`) |
| Existing Danube mock data | `lib/dev/mocks.ts` (`danubeLegends`, `sampleCabins`) |
| `Button`, `Card`, `cn()` | `components/ui/*`, `lib/shadcn/utils.ts` |

## Architecture

### Trigger (local state)

`booking-summary.tsx` gains a `useState` open flag. The existing button gets
`onClick={() => setSummaryOpen(true)}` and the component renders:

```tsx
<ItinerarySummaryModal
  open={summaryOpen}
  onOpenChange={setSummaryOpen}
  data={ITINERARY_SUMMARY_MOCK}
/>
```

No changes to `ui-view-store.ts`, `view-registry.ts`, or `commands.ts`.

### Modal shell

Portaled full-viewport shadcn `Dialog` (correct here — this is a full takeover with its own CTAs,
unlike the deliberately-confined cabin modal). The content is an **inset rounded beige panel** over
a dark backdrop, matching the mockups:

- **Sticky top bar:** left → close `X`, Share, Save icon buttons; center → Riverside logo tab;
  right → `Talk to a Riverside Specialist` (secondary) + `Continue to booking` (primary green).
- **Scrollable body** (sections below).
- **Sticky footer bar:** `Total: € 27,240` left; the two CTAs repeated right.

### Body sections

1. **Header image block** — full-width rounded image, dark gradient overlay, itinerary title
   (serif, large) + subtitle overlaid bottom-left. (mockup #1)
2. **Details chip row** — icon chips, same visual style as the existing `SummaryField`:
   `2 people` · `September` · `Vienna` · `Budapest +3` · date range · `€ … p.p.` ·
   `Dietary Accommodation` · `Owner's Suite`. (mockup #2)
3. **Two-column grid** — `lg:grid-cols-[...]`, collapses to a single column on mobile:
   - **Left column:**
     - **Cabin card:** `CabinDetailGallery` + name + meta line (`2 guests | 80m² | from 12,229 EUR
       | Balcony`) + Bedroom / Bathroom / Amenities lists (shared `DetailSection`). (mockup #3)
     - **Package card:** "Package" heading + "Change package" link; bordered card with price dot
       (`€ 9,174 p.p.`), package name (`Premium All Inclusive Including Excursions`), and an
       inclusion list (Free Wifi, Cakes…, Pre-selected Excursions, Minibar, 24h Roomservice,
       Premium Wine…, Dinner in "The Atelier"). (mockup #5)
   - **Right column — Itinerary:** title `Vienna – Vienna`, country pills (`Austria | Hungary |
     Slovakia`), description paragraph, then a vertical list of **city cards**: image + "Days X"
     badge, city name + country, "More information" toggle (static), and optional Add-On rows
     (`Add-On … Day 1 … A private evening of chamber music at Palais Eschenbach`). (mockups #3, #4)
4. **Footer total bar** — `Total: € 27,240` + the two CTAs.

## Data model (mock)

New module `lib/itinerary-summary/`:

### `types.ts`

```ts
export type ItinerarySummary = {
  header: { title: string; subtitle: string; image: string };
  details: {
    guests: string;        // "2 people"
    month: string;         // "September"
    embarkation: string;   // "Vienna"
    stops: string;         // "Budapest +3"
    dates: string;         // "20 – 27 Sep 2026"
    pricePerPerson: string;// "€ 9,174 p.p."
    dietary: string;       // "Dietary Accommodation"
    cabinName: string;     // "Owner's Suite"
  };
  cabin: Cabin;            // reuse lib/agent-ui/commands Cabin
  package: {
    pricePerPerson: string;
    name: string;
    inclusions: string[];
  };
  itinerary: {
    title: string;          // "Vienna – Vienna"
    countries: string[];    // ["Austria", "Hungary", "Slovakia"]
    description: string;
    cities: SummaryItineraryCity[];
  };
  total: string;            // "€ 27,240"
};

export type SummaryItineraryCity = {
  id: string;
  name: string;
  country: string;
  days: string;             // "Days 1, 2 & 8"
  image: string;
  addOns?: { label: string; day: string; description: string }[];
};
```

Icons for the details row live in the component (a view concern), not in data.

### `mock.ts`

`ITINERARY_SUMMARY_MOCK: ItinerarySummary`, populated to match the screenshots (Danube Serenade,
Owner's Suite, Premium All Inclusive package, € 27,240). City list and Add-Ons are derived from the
existing `danubeLegends` cities in `lib/dev/mocks.ts`.

> **Assumption to confirm:** the right column's full city list, the "More information" expanded
> content, and per-city Add-Ons are only partially shown in the screenshots (Vienna, cut off). They
> will be mocked from `danubeLegends`; "More information" is a static toggle. Adjust the mock later
> if the real content differs.

## Components (new)

Co-located under `components/panels/itinerary-summary/`:

- `itinerary-summary-modal.tsx` — Dialog shell, top bar, footer bar, composition.
- `summary-header.tsx` — header image block.
- `summary-details-row.tsx` — icon chip row.
- `summary-cabin-card.tsx` — gallery + meta + detail sections.
- `summary-package-card.tsx` — package card.
- `summary-itinerary-column.tsx` — itinerary header + city card list (city card may be a local
  sub-component or its own file `summary-city-card.tsx`).
- `summary-footer-bar.tsx` — total + CTAs.

### Small reuse refactor

Extract `DetailSection` from `cabin-detail-modal.tsx` into
`components/panels/cabin/cabin-detail-section.tsx` and import it from both the cabin modal and the
new cabin card. One import change in `cabin-detail-modal.tsx`; no behavior change.

## Styling

Tailwind + `cn()`, colors via existing tokens (`bg-beige-*`, `text-muted-foreground`,
`text-primary`, `border-border`) and `app-config.ts` accent. No hardcoded colors. Match the serif
display font (`font-display`) for titles as the cabin modal does.

## Testing

Per `conventions/testing.md`, a co-located smoke test
`components/panels/itinerary-summary/itinerary-summary-modal.test.tsx`:

- Renders with `ITINERARY_SUMMARY_MOCK` when `open`.
- Asserts header title, cabin name, package name, total, and at least one city name appear.
- Asserts `onOpenChange(false)` fires when close is activated.

## Verification

- `pnpm lint` clean.
- `pnpm test` green.
- Manual: button opens modal, all six sections render matching the mockups, close works,
  layout collapses sensibly at narrow widths.

## Build sequence (for the plan)

1. `lib/itinerary-summary/types.ts` + `mock.ts`.
2. Extract `cabin-detail-section.tsx`; repoint `cabin-detail-modal.tsx`.
3. Leaf components (header, details row, cabin card, package card, itinerary column, footer).
4. `itinerary-summary-modal.tsx` shell composing the leaves.
5. Wire the button in `booking-summary.tsx`.
6. Smoke test + lint + test.
