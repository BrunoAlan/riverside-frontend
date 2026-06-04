# Design — Cabin & Experience Intents Integration

> **Date**: 2026-06-04
> **Scope**: Wire the missing cabin/experience intents and commands from
> [`docs/frontend-integration.md`](../../frontend-integration.md), **without** a basket view.
> **Branch**: `feat/cabin-experience-intents`

---

## Goal

Integrate the subset of the basket protocol the team needs now:

- **Cabins**: emit `select_cabin`, react to `add_cabin_to_basket`.
- **Experiences**: emit `select_experience`, react to `show_experience_detail` and
  `add_experience_to_basket`.

There is **no basket UI** in this scope. The `add_*_to_basket` commands drive
per-card "selected / added" feedback only.

### Direction recap (this is the core distinction)

- **➡️ Frontend → Backend (intents)**: the UI emits them when the user acts. Published
  on the `frontend-intent` topic via `useFrontendIntent`.
- **⬅️ Backend → Frontend (commands)**: validated with Zod in `commands.ts`, applied in
  the `applyCommand` reducer. The frontend never generates them — it only reacts.

The frontend never marks anything as "added" on its own. It emits an intent, the backend
decides, and only the returning `add_*_to_basket` command updates the card.

### In scope

| Direction | Name | Trigger / Effect |
|---|---|---|
| ➡️ intent | `select_cabin` | Button "Select this suite" in cabin detail modal → `{ cabin_id }` |
| ➡️ intent | `select_experience` | Button "Confirm" in experience card → `{ experience_id, day, passenger_count? }` |
| ⬅️ command | `show_experience_detail` | Sets which `ExperienceCard` is open (`detailExperienceId`) |
| ⬅️ command | `add_cabin_to_basket` | Sets `selectedCabinId` → card/button shows "Selected ✓" |
| ⬅️ command | `add_experience_to_basket` | Appends `(experience_id, day)` → card shows "Added ✓" |

### Out of scope

`show_basket_summary`, `view_basket`, a basket view, `show_experience_options` (grid),
`explore_experience`, `view_experience_selection`.

---

## Architecture

The change follows the existing agent-UI contract patterns 1:1
(`conventions/adding-a-command.md`). No new architecture.

### 1. Command schemas — `lib/agent-ui/commands.ts`

Three commands added to the `UiCommand` discriminated union via `Base.extend`:

```ts
const ShowExperienceDetail = Base.extend({
  type: z.literal('show_experience_detail'),
  payload: z.object({ experience_id: z.string().nullable() }),
});

const AddCabinToBasket = Base.extend({
  type: z.literal('add_cabin_to_basket'),
  payload: z.object({
    cabin_id: z.string(),
    name: z.string(),
    category: z.string(),
    guests: z.number().int(),
    area: z.number(),
    price_from: z.number().nullable(),
    view: z.string(),
  }),
});

const AddExperienceToBasket = Base.extend({
  type: z.literal('add_experience_to_basket'),
  payload: z.object({
    experience_id: z.string(),
    day: z.string(),
    passenger_count: z.number().int(),
  }),
});
```

`show_experience_detail` mirrors `show_cabin_detail` (nullable id = open/close).

### 2. Store state — `lib/agent-ui/ui-view-store.ts` + `ui-view-types.ts`

`UiView` `itinerary` variant gains an optional field (mirrors `detailCityId`):

```ts
| { type: 'itinerary'; itinerary?: ItineraryFull; detailCityId?: string; detailExperienceId?: string }
```

Two new top-level store fields carry the "added" feedback (no basket view exists yet):

```ts
selectedCabinId: string | null;            // initial: null
addedExperiences: Array<{ experienceId: string; day: string }>;  // initial: []
```

Reducer cases in `applyCommand`:

- `show_experience_detail`: guard `state.view.type === 'itinerary'` (mirrors
  `show_cabin_detail`); set `view.detailExperienceId = payload.experience_id ?? undefined`.
  Off-stage → only update `source` / `lastCorrelationId`.
- `add_cabin_to_basket`: `selectedCabinId = payload.cabin_id`.
- `add_experience_to_basket`: append `{ experienceId, day }` if no existing entry matches
  both (idempotent by `(experience_id, day)`), else leave unchanged.

All cases set `source: 'agent'` and `lastCorrelationId` per the convention.

### 3. Experience UI — `panel-map.tsx`, `city-experiences-panel.tsx`, `experience-card.tsx`

- **`CityExperiencesPanel`**: drop the local `openId` state. The open card is
  `view.detailExperienceId ?? experiences[0]?.id`. Toggling calls `setViewFromUser` with the
  updated `detailExperienceId` (**no intent emitted** — `explore_experience` is out of
  scope). A `show_experience_detail` command can override which card is open.
- **`panel-map.tsx`**: passes the parent city's day options and an `onToggle` handler that
  writes `detailExperienceId` down to `CityExperiencesPanel`.
- **`ExperienceCard`**: gains a **day selector** in the expanded footer. Options come from
  the parent city's `day_details[].day`; if `day_details` is empty, fall back to
  `[city.days]`. The **Confirm** button emits `select_experience { experience_id, day }`
  (the selected day; `passenger_count` omitted so the backend uses the traveler-profile
  default). When `(experience_id, day)` is in `addedExperiences`, the card shows
  **"Added ✓"**. **Reject** is left untouched (no intent defined for it yet).

### 4. Cabin UI — `cabin-detail-modal.tsx`, `panel-cabin-selection.tsx`

- **`CabinDetailModal`**: add a **"Select this suite"** button in the detail footer. It
  calls an `onSelect` prop. When `selected` is true the button reads **"Selected ✓"** and is
  disabled.
- **`panel-cabin-selection.tsx`**: passes `onSelect` (emits `select_cabin { cabin_id }`) and
  `selected={selectedCabinId === detailCabin?.id}` (read from the store) into the modal.

---

## Data flow (round-trips)

```
User taps "Select this suite"
  → ➡️ emit select_cabin { cabin_id }              (FE → BE)
  → ⬅️ receive add_cabin_to_basket { cabin_id, ... }  (BE → FE) → selectedCabinId → "Selected ✓"

User picks a day + taps "Confirm"
  → ➡️ emit select_experience { experience_id, day }  (FE → BE)
  → ⬅️ receive add_experience_to_basket { experience_id, day, passenger_count } (BE → FE)
       → addedExperiences += (id, day) → "Added ✓"

Backend pushes show_experience_detail { experience_id }  (BE → FE)
  → detailExperienceId set → that card opens (local expand still works as fallback)
```

---

## Error / edge handling

- `show_experience_detail` while not on the `itinerary` view: ignored (only `source` /
  `lastCorrelationId` update), same guard style as `show_cabin_detail`.
- `add_experience_to_basket` with an already-present `(experience_id, day)`: no duplicate
  (idempotent).
- `select_experience` without a chosen day: the day selector defaults to the first available
  day, so the intent always carries a `day` (the doc requires it; backend rejects otherwise).
- No participant / room when emitting: `useFrontendIntent` already logs and drops the intent.

---

## Testing

Tests live next to the code.

- **`commands.test.ts`**: valid + invalid payloads for `show_experience_detail`,
  `add_cabin_to_basket`, `add_experience_to_basket`.
- **`ui-view-store.test.ts`**: reducer effects — `detailExperienceId` set/cleared and the
  off-stage guard; `selectedCabinId` set; `addedExperiences` append + idempotency.
- **Intent emission**: `select_cabin` and `select_experience` build the right envelope
  (entities shape), reusing the `frontend-intent` test style.

Verification gate before any push/merge (per `AGENTS.MD`): `pnpm lint` and `pnpm test` clean.

---

## Assumptions (confirmed with user)

- `day` options come from the parent city's `day_details[].day`, not the whole itinerary.
- `passenger_count` is omitted from `select_experience` (backend uses the default).
- `Reject` on the experience card stays as-is (no intent defined).
- `show_experience_detail` has no triggering intent in this scope; it arrives proactively
  and the local expand/collapse remains the interactive fallback.
