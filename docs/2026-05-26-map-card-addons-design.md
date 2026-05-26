# Map card add-ons — design

Status: approved
Date: 2026-05-26
Branch: `feat/map-card-addons`

## Goal

Let the city cards rendered on the map show one or more **add-ons**. Each add-on starts in a `pending` state with `Confirm` / `Reject` actions. Once decided, the buttons are replaced by a tag indicating the decision. State is purely visual for now — the goal is to be able to see the cards on the map and iterate on styling.

## Scope

In scope:

- Data model for add-ons attached to a `City` (multiple per city).
- Rendering the add-on block(s) inside `CityCard`.
- Per-card decision state (`confirmed` / `rejected`) wired through `uiViewStore`, following the same pattern as `cabin_selection.detailCabinId`.
- Tests for the store action and the card behavior.

Out of scope:

- New `UiCommand` for the agent to set/read decisions.
- Cross-view persistence of decisions (resetting when the view changes is acceptable).
- Wiring the add-on block into other surfaces (e.g. `cabin-detail-modal`).
- Hardcoding payload-driven add-ons in the `show_itinerary` command.

## Data model

```ts
// lib/map/cities.ts

export type AddOn = {
  id: string;     // unique across the whole app, e.g. "vienna-chamber-music"
  day: string;    // human label, e.g. "Day 1"
  title: string;  // human description shown in the card
};

export type City = {
  id: string;
  name: string;
  country: string;
  image: string;
  days: string;
  lon: number;
  lat: number;
  addOns?: AddOn[];
};
```

`addOns` is optional. Cities with no add-ons render exactly as today.

The actual add-on data is hardcoded inside the `cities` array in `lib/map/cities.ts`, since `map-canvas` renders from that export. `lib/map/itineraries.ts` reuses the same `City` objects and inherits the add-ons automatically.

## View state

`uiViewStore` is the single source of truth for the view, following the convention in `conventions/agent-ui.md` (`cabin_selection.detailCabinId` is the precedent).

```ts
// lib/agent-ui/ui-view-types.ts

export type AddOnDecision = 'confirmed' | 'rejected';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; images: DreamImage[] }
  | { type: 'itinerary'; addOnDecisions: Record<string, AddOnDecision> }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection'; detailCabinId?: string };
```

Reducer changes in `uiViewStore`:

- Whenever the store transitions **into** the `itinerary` view, `addOnDecisions` is initialized to `{}`. Re-entering the view resets prior decisions (acceptable per the user — purpose right now is styling).
- New store action `setAddOnDecision(addOnId, decision)`:
  - Source: `'user'`.
  - No-op if the current view is not `itinerary`.
  - Otherwise updates `view.addOnDecisions[addOnId] = decision`.

Mocks in `lib/dev/mocks.ts` are updated to include `addOnDecisions: {}` for the itinerary view.

## UI — `CityCard`

The card gains a vertical list of add-on blocks below the header (city name + expand button). Layout per block:

```
┌─────────────────────────┐
│ Add-On         Day 1    │   <- label row (left: "Add-On", right: day)
│                         │
│ A private evening of    │   <- title (wraps)
│ chamber music at        │
│ Palais Eschenbach.      │
│                         │
│ [ Confirm ]  [ Reject ] │   <- only when status === 'pending' && interactive
└─────────────────────────┘
```

States per add-on:

- **Pending** — both buttons visible. `Confirm` is the primary button; `Reject` is secondary/outline.
- **Confirmed** — buttons replaced by a subtle "Confirmed" indicator.
- **Rejected** — buttons replaced by a subtle "Rejected" indicator.

When `CityCard` is rendered with `interactive={false}` (used by the cluster layer for grouped previews), the add-on actions are hidden — only the static content (label, day, title) is shown — so cluster previews don't grow out of bounds.

Tokens reuse what the card already uses: `bg-beige-*`, `text-primary`, `text-muted-foreground`. Concrete spacing/colors are tuned during implementation while looking at the reference screenshots.

## Files touched

- `lib/map/cities.ts` — `AddOn` type; optional `addOns` on `City`; populate `addOns` on Vienna and Bratislava (using the copy from the reference screenshots). Wachau Valley deliberately left without add-ons to exercise the empty case.
- `lib/map/itineraries.ts` — no changes needed; its local `City` literals get `addOns` if/when desired (left untouched for now).
- `lib/agent-ui/ui-view-types.ts` — `AddOnDecision`; widen `itinerary` view with `addOnDecisions`.
- `lib/agent-ui/ui-view-store.ts` — initialize `addOnDecisions: {}` whenever transitioning into `itinerary`; add `setAddOnDecision(id, decision)`.
- `lib/dev/mocks.ts` — include `addOnDecisions: {}` in the itinerary mock(s).
- `components/panels/map/city-card.tsx` — render add-on list; read/write decisions via the store; hide actions when `interactive=false`.

## Testing

- `lib/agent-ui/ui-view-store.test.ts`:
  - `setAddOnDecision` writes into the active `itinerary` view's `addOnDecisions`.
  - `setAddOnDecision` is a no-op when the active view is not `itinerary`.
  - Re-entering `itinerary` resets `addOnDecisions` to `{}`.
- No component test: the project's vitest config is `environment: 'node'`, with no jsdom / `@testing-library/react` installed, and no existing `.test.tsx` files. Setting that infra up is out of scope (YAGNI). Card behavior is verified manually via the dev panel.

## Risks / open questions

- The reset-on-reentry behavior is explicitly the chosen tradeoff. If later we want decisions to survive a round-trip through another view, we promote the record into a top-level store slice (the original "option B"). The shape of `setAddOnDecision` does not change in that case.
- The visual treatment of the `confirmed` / `rejected` states is intentionally vague — it will be tuned during implementation against the reference screenshots.
