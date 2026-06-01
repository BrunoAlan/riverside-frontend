# Itinerary City Detail — Design Spec

**Date:** 2026-06-01
**Status:** Draft — pending user review
**Owner:** Alan Bruno

## Goal

Add a **city detail view** for the itinerary. When focused on a single city, the
map fills the background centered on that city's coordinates, the other city
cards are hidden, and a larger card overlays the screen with a per-day breakdown
of that city.

It can be entered/exited **two ways**:

1. **User** taps the expand button on a city card. The frontend flips the local
   view _and_ notifies the deterministic backend via a `FrontendIntent` so the
   agent always knows what the user is looking at.
2. **Agent** sends a `show_city_detail` UI command.

## Scope

In scope:

- Extend the existing `itinerary` view with an optional `detailCityId`. Detail
  mode is on ⟺ `detailCityId` is set. The map stays mounted — this is **not** a
  new top-level view.
- A new agent → frontend command `show_city_detail` that opens/closes the detail
  (nullable `city_id`, mirroring `set_cabin_detail`).
- A new **outbound** `FrontendIntent` transport (frontend → backend) over the
  LiveKit data channel on topic `frontend-intent`, plus a `useFrontendIntent`
  hook. This is the first outbound UI-event channel in the app.
- Emit `explore_destination` on open and `view_itinerary` on close.
- Extend the itinerary city wire payload with optional `day_details` (per-day
  breakdown) and populate the mocks.
- A `CityDetailCard` component (the large overlay card).
- `MapCanvas` gains a `focusCity` prop: fly the camera to the city and suppress
  the small-card layer while focused.
- Wire the existing `CityCard` expand button (currently a `console.log` TODO) to
  open the detail.
- A dev-panel mock for `itinerary` with the detail open.
- Tests for the schema, the reducer, and the intent envelope builder.

Out of scope (deferred):

- **Add-ons in the detail card.** v1 shows no add-on block in the detail.
  Add-ons stay an overview-only concept; the wire payload is unchanged for them.
- Real per-day copy beyond what we seed in the mocks.
- Animations beyond the MapLibre `flyTo` camera move.
- Any "extra info" beyond the per-day breakdown (see Data model).

## Non-goals

- No new full-screen view / view swap. The detail is a focused state of the
  `itinerary` view, so the map is never re-initialized (it is created once and
  kept alive — see `map-canvas.tsx`).
- No client-side fetching. Day content travels in the itinerary payload (or the
  local mock for dev).

## Data model

### View type (`lib/agent-ui/ui-view-types.ts`)

```ts
| {
    type: 'itinerary';
    itinerary?: ItineraryFull;
    addOnDecisions: Record<string, AddOnDecision>;
    detailCityId?: string;
  }
```

`detailCityId` absent/`undefined` → itinerary overview. Present → detail mode for
that city id. The city is resolved from `itinerary.cities` by id.

### Itinerary city payload (`lib/agent-ui/commands.ts`, snake_case)

`ItineraryCity` gains an optional, backward-compatible `day_details` field. The
existing `days` string (e.g. `"Days 1, 2 & 8"`) stays as the card badge;
`day_details` is the per-day breakdown the detail card renders.

```ts
const ItineraryCity = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  image: z.string(),
  days: z.string(),
  lon: z.number(),
  lat: z.number(),
  day_details: z
    .array(z.object({ day: z.string(), description: z.string() }))
    .optional(),
});
```

- `day` is a human label rendered as the section heading (e.g. `"Day 01"`).
- `description` is the paragraph for that day.
- Optional, so existing itinerary payloads (and the small card) are unaffected.

`ItineraryCity` is currently a private const in `commands.ts`. Export it and its
inferred type (`export const ItineraryCity = …; export type ItineraryCity = …`)
so `CityDetailCard` and `PanelMap` can type the focused city directly off the
wire shape (which carries `day_details`), rather than the local `City` type
(which does not).

The "extra info" mentioned in the brief **is** this per-day breakdown — there is
no separate empty placeholder section. The detail card shows the city header
plus one block per `day_details` entry.

> The local `City` type (`lib/map/cities.ts`) is structurally compatible:
> `ItineraryCity` remains assignable to `City` (the new field is optional). The
> small `CityCard` does not read `day_details`, so it is visually unchanged.

### Wire command (`lib/agent-ui/commands.ts`, snake_case)

```ts
const ShowCityDetail = Base.extend({
  type: z.literal('show_city_detail'),
  payload: z.object({ city_id: z.string().nullable() }),
});
```

`city_id` is a string to open, `null` to close. Same nullable-payload style as
`set_cabin_detail`. Added to the `UiCommand` discriminated union.

### FrontendIntent envelope (outbound, `lib/agent-ui/frontend-intent.ts`)

Per the **FrontendIntent v1** contract. The frontend publishes this on topic
`frontend-intent` over the LiveKit data channel; the backend skips the LLM
classifier and runs the named intent deterministically.

```ts
type FrontendIntent = {
  version: 'v1';
  topic: 'frontend-intent';
  intent: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  timestamp?: string;
  user_message?: string;
  entities?: Record<string, unknown>;
};
```

Two intents are emitted by this feature:

| Trigger             | `intent`              | `entities`                  | `user_message`                       |
| ------------------- | --------------------- | --------------------------- | ------------------------------------ |
| Expand a city card  | `explore_destination` | `{ destination_id: <id> }`  | `User opened <city.name> detail`     |
| Close the detail    | `view_itinerary`      | `{ itinerary_name: <name> }`| `User returned to the itinerary`     |

> **To confirm with backend:** `explore_destination` + `destination_id` matches
> the contract's "Destination detail" example. `view_itinerary` is **assumed** —
> there is no exact example for "returned to itinerary overview"; adjust if
> `Intent.md` uses a different canonical id. If the id is unknown the backend
> resolves it to `unknown` and replies with a `soft_redirect`, so a wrong guess
> degrades safely.

## Store changes (`ui-view-store.ts`)

`applyCommand` switches from `set(() => …)` to `set((state) => …)` so the
`show_city_detail` case can read the current view. New case:

```ts
case 'show_city_detail': {
  if (state.view.type !== 'itinerary') {
    // Detail only makes sense over a loaded itinerary; ignore otherwise.
    return { source: 'agent', lastCorrelationId: cmd.correlationId };
  }
  return {
    view: {
      ...state.view,
      detailCityId: cmd.payload.city_id ?? undefined,
    },
    hint: null,
    source: 'agent',
    lastCorrelationId: cmd.correlationId,
  };
}
```

Rationale for ignoring when not on `itinerary`: unlike cabins, the detail needs
the itinerary's `cities` to resolve `city_id`. Switching this contained `set`
signature to take `state` does not affect the other cases.

`setViewFromDev` / `setViewFromUser` are untouched — they replace the whole
`view`, so an `itinerary` view with or without `detailCityId` flows through
unchanged. `setAddOnDecision` already preserves the rest of the view; it must
also preserve `detailCityId` (spread `...state.view` instead of re-listing
fields).

## Outbound transport + hook

### `lib/agent-ui/frontend-intent.ts`

- Pure builder `buildFrontendIntent(intent, opts)` returning the v1 envelope
  (no clock access in the builder — `timestamp` is passed in by the caller or
  omitted, since `Date.now()`/`new Date()` are avoided in deterministic code).
- `publishFrontendIntent(room, envelope)` — JSON-encodes and calls
  `room.localParticipant.publishData(bytes, { topic: 'frontend-intent', reliable: true })`.

This is the outbound mirror of `transport.ts` (which only handles inbound
`ui-commands`). It is the **only** place that publishes to the data channel.

### `hooks/use-frontend-intent.ts`

`useFrontendIntent()` returns `sendIntent(intent, { entities?, userMessage? })`.
Grabs the room from `useMaybeRoomContext()` (same pattern as
`use-chat-transcription.ts`) and no-ops if there is no room / local participant.

## Components

### Files

- `lib/agent-ui/frontend-intent.ts` — envelope builder + publisher (new).
- `hooks/use-frontend-intent.ts` — `useFrontendIntent` (new).
- `components/panels/map/city-detail-card.tsx` — `CityDetailCard` (new).
- `components/panels/map/map-canvas.tsx` — add `focusCity` prop (edit).
- `components/panels/map/panel-map.tsx` — detail wiring + overlay (edit).
- `components/agent-ui/views/itinerary-view.tsx` — pass `detailCityId` (edit).

### `CityDetailCard`

Props:

```ts
{ city: ItineraryCity; onClose: () => void }
```

(Typed as `ItineraryCity` so `city.day_details` is in scope.)

- A larger card overlaid over the map, centered, matching the mockup: image
  header with the `days` badge and brand mark, `name` + `country`, a close `X`
  button, then one block per `day_details` entry (`day` heading + `description`
  paragraph). No add-on block in v1.
- Reuses the project card/`Button` primitives and `next/image`, styled like the
  existing `CityCard` (beige palette, rounded, `cn()` composition).
- If `day_details` is empty/absent, the header still renders and the body is
  simply empty — no error.
- `onClose` is wired to the `X` button.

### `MapCanvas` — `focusCity` prop

```ts
focusCity?: City;
```

- New camera effect branch: when `focusCity` is set, `map.flyTo({ center: [lon, lat], zoom: <detail zoom>, … })` (animated). When it clears, fall back to the
  existing `fitBounds(cityList)` / `jumpTo` overview behavior.
- The `CityCardLayer` is **not rendered** while `focusCity` is set (cards
  hidden in detail mode). The map, grain, and gradients stay.
- Existing overview behavior (no `focusCity`) is unchanged.

### `PanelMap`

- Accepts the detail context: either the full `itinerary` view or, minimally,
  `detailCityId` alongside the existing `cities` / `center` / `zoom`.
- Resolves `detailCityId` → an `ItineraryCity` from `itinerary.cities`. If it
  does not match, the resolved value is `null` and the panel renders the
  overview (no error).
- Passes the resolved city as `focusCity` to `MapCanvas` (an `ItineraryCity` is
  assignable where `MapCanvas` wants a `City` — the extra `day_details` field is
  ignored there).
- Renders `<CityDetailCard city={...} onClose={...} />` as an overlay when a city
  is resolved.
- `handleCityExpand(city)` (currently a `console.log` TODO):
  1. `setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions, detailCityId: city.id })`
  2. `sendIntent('explore_destination', { entities: { destination_id: city.id }, userMessage: \`User opened ${city.name} detail\` })`
- `handleClose`:
  1. `setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions })` (clears `detailCityId`)
  2. `sendIntent('view_itinerary', { entities: { itinerary_name: itinerary?.name }, userMessage: 'User returned to the itinerary' })`

To do (1)+(2) `PanelMap` needs `itinerary` + `addOnDecisions` to reconstruct the
view. Cleanest: `ItineraryView` passes the whole `view` down (or the needed
fields) so `PanelMap` can rebuild it. Final prop shape decided in the plan.

### `ItineraryView`

Passes `view.detailCityId` (and whatever `PanelMap` needs to rebuild the view)
down to `PanelMap`, in addition to today's `cities` / `center` / `zoom`.

## Dev panel (`lib/dev/mocks.ts`)

The existing `danube_legends` itinerary mock gets `day_details` added to its
cities (Budapest, Vienna), and a third entry opens the detail:

```ts
itinerary: [
  { id: 'default', label: 'Map (fallback cities)', /* unchanged */ },
  { id: 'danube_legends', label: 'Danube Legends (agent payload)', /* + day_details on cities */ },
  {
    id: 'danube_legends_detail',
    label: 'Detail open (Vienna)',
    view: { type: 'itinerary', addOnDecisions: {}, itinerary: <danube_legends payload>, detailCityId: 'vienna' },
  },
],
```

The first two existing entries are preserved (the second gains `day_details` on
its cities so the detail card has content). The `<danube_legends payload>` in the
third entry reuses the same itinerary object as the second.

## Tests (vitest, co-located)

- `commands.test.ts`:
  - `show_city_detail` parses with a string `city_id` and with `null`; rejects a
    missing `city_id` / wrong types.
  - `ItineraryFull` parses with and without `day_details`; rejects malformed
    `day_details` entries.
- `ui-view-store.test.ts`:
  - `show_city_detail` with a string id, while on `itinerary`, sets
    `detailCityId` and preserves `itinerary` + `addOnDecisions`; `source = 'agent'`.
  - `show_city_detail` with `null` clears `detailCityId`.
  - `show_city_detail` while on a non-`itinerary` view is a no-op on `view`.
  - `setAddOnDecision` preserves `detailCityId`.
- `frontend-intent.test.ts` (new):
  - `buildFrontendIntent('explore_destination', { entities, userMessage })`
    produces a valid v1 envelope (`version: 'v1'`, `topic: 'frontend-intent'`,
    correct `intent`/`entities`/`user_message`).

Component-level tests for `CityDetailCard` / `MapCanvas` are out of scope (the
existing map components have no co-located tests); rely on the dev-panel mock for
visual verification.

## Risks / open questions

- **Close intent id (`view_itinerary`)** — assumed; confirm against the backend
  `Intent.md` catalog.
- **Detail zoom level** — the `flyTo` zoom for a single city is tuned during
  implementation against the mockup framing.
- **Card vs. marker overlap** — the city marker sits behind the centered detail
  card. Acceptable per the brief ("centrado en las coordenadas"); a camera
  offset can be a follow-up if the city should peek beside the card.
- **`PanelMap` prop shape** — passing the whole `itinerary` view vs. discrete
  fields is finalized in the plan.

## Out of this spec (future work)

- Add-ons inside the detail card.
- Richer per-day content (images, highlights, timeline) beyond `day_details`.
- Camera offset / split layout so the focused city is visible beside the card.
- A "back" gesture other than the `X` (e.g. clicking the map).
