# City Experiences — design

## Context

The backend now sends a per-city `experiences` array inside the
`show_itinerary_options` payload. Each experience describes a signature offering
in that city:

```json
{
  "id": "signature_vienna_belvedere_palace",
  "name": "Signature Vienna: VIP Evening at Belvedere Palace",
  "type": "private_concert_and_museum_visit",
  "venue": "Belvedere Palace",
  "description": "After-hours VIP experience at Belvedere Palace ..."
}
```

Not every city carries experiences (e.g. Bratislava, Tulln, Dürnstein come with
none).

Today the city UI has two unrelated, mock-only pieces:

- A hardcoded **"3 excursions available"** badge on the map card
  (`MOCK_ADD_ON_COUNT`), flagged with a `TODO` to wire to real data.
- An **add-ons** concept (`AddOn` type + mock data in `lib/map/cities.ts`,
  `addOnDecisions` in the view state, `setAddOnDecision` in the store, and
  Confirm/Reject blocks in the card). This is mock-only and **not useful** — it
  gets removed entirely.

## Goal

1. Wire the real `experiences` count into the card badge.
2. List a city's experiences in its detail card when expanded.
3. Rip out the add-ons machinery from every layer.

## Approach

Treat `experiences` as **wire data** that lives on `ItineraryCity` — the same
place `day_details` already lives. The local `City` type (used by the map card
components) gains an optional `experiences` field so the card can read the count.

## Changes by layer

### 1. Wire schema — `lib/agent-ui/commands.ts`

- Add `Experience` zod object:
  `{ id: string, name: string, type: string, venue: string().nullable(), description: string }`.
  Export the inferred `Experience` type.
- Add `experiences: z.array(Experience).optional()` to `ItineraryCity`.
- Update the `ItineraryCity` comment that references the now-removed `addOns`.

### 2. View types — `lib/agent-ui/ui-view-types.ts`

- Remove `AddOnDecision`.
- Remove `addOnDecisions` from the `itinerary` view. New shape:
  `{ type: 'itinerary'; itinerary?: ItineraryFull; detailCityId?: string }`.

### 3. Store — `lib/agent-ui/ui-view-store.ts`

- Remove `setAddOnDecision` (interface + implementation) and the
  `AddOnDecision` import.
- `show_itinerary_options` returns the itinerary view without `addOnDecisions`.

### 4. Map types / data — `lib/map/cities.ts`

- Remove the `AddOn` type and the `addOns` fields from the mock `cities` data.
- Add `experiences?: Experience[]` to the `City` type (type-only import of
  `Experience` from `commands.ts`), so the card can count them.

### 5. Card — `components/panels/map/city-card.tsx`

- Delete `AddOnBlock`, `AddOnActions`, `MOCK_ADD_ON_COUNT`, and the now-unused
  imports (`AddOn`, `AddOnDecision`, `useUiViewStore` if otherwise unused).
- Badge: render `{count} experiences available` where
  `count = city.experiences?.length ?? 0`. **Hide the badge entirely when
  `count` is 0** (cities with no experiences show nothing).

### 6. Detail card — `components/panels/map/city-detail-card.tsx`

- Below the existing `day_details` list, add an experiences section. Per
  experience render: name (prominent), venue (subtle, only when present), and
  description — matching the existing `day_details` styling.

### 7. Mocks — `lib/dev/mocks.ts`

- Remove `addOnDecisions: {}` from the two itinerary mocks.
- Replace the `danubeLegends` mock with the **full backend payload**: all six
  cities (Budapest, Bratislava, Tulln, Wachau Valley, Vienna, Dürnstein) with
  their real coordinates, `days`, and `experiences` (Budapest ×3, Vienna ×1; the
  rest have none). This makes the dev panel render the complete itinerary,
  exercising both the populated and empty-experiences states.
- Keep the existing `day_details` on the cities that have them.

### 8. Tests

- `commands.test.ts`: parse a city with `experiences`; reject a malformed
  experience entry — mirroring the existing `day_details` tests.
- `ui-view-store.test.ts`: remove `setAddOnDecision` cases and drop
  `addOnDecisions` from view expectations.
- `view-detail.test.ts`: drop `addOnDecisions` from the view literals.

## Decisions

- Badge copy changes from "excursions available" to **"experiences available"**.
- Detail card order: **day_details first, experiences below**.
- Badge is hidden when a city has zero experiences.

## Out of scope

- The compare-itinerary view does not render experiences (no change).
- No new presentational-component tests beyond the existing schema/store tests,
  matching the repo's current testing surface.
