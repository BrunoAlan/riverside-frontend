# Agent-driven suggestion pills + command drift fixes

Implements the remaining frontend work from
`docs/2026-07-18-excursions-navigation-contract.md`, built ahead of the backend so
everything works the day their side ships.

Audit result against that contract: sections 0–3 and 5 are already implemented on
`main` (`activeTab` in `UiView`, `view_excursions` intent, `show_itinerary_tab`
command, auto tab-switch on `show_experience_detail`). What remains on our side:

1. **§7** — the `show_suggestions` command (backend-driven pills).
2. **Annex B + one new find** — three commands the frontend currently rejects on
   `safeParse`, so they are silently dropped in `transport.ts`.
3. **§4** — origin marker. Decision: no visual distinction needed. Cards already
   show the added state via `sync_itinerary_experiences`; §4 is covered once
   `add_experience_to_basket` parses (point 2). The `source` field is already
   accepted by the schema (`commands.ts:10`).

## Goals

- Backend can drive the suggestion pills; static pills from `app-config.ts` remain
  as fallback so the UI is never empty (hybrid model from the contract doc).
- The three drifted commands parse instead of being dropped.
- Contract doc updated to reflect reality.

## Non-goals

- Rendering "added by the agent" differently (explicitly declined).
- Backend pills persisting across view changes (explicitly declined — they clear).
- Distinguishing pill taps from typed chat on the wire (contract doc §7 covers why).

## 1. `show_suggestions` command (§7)

### Schema — `lib/agent-ui/commands.ts`

```ts
const ShowSuggestions = Base.extend({
  type: z.literal('show_suggestions'),
  payload: z.object({
    suggestions: z.array(
      z.object({
        id: z.string(),
        /** Sent to the chat when tapped. */
        text: z.string(),
        /** Visible label; falls back to `text`. */
        label: z.string().optional(),
      })
    ),
  }),
});
```

Added to the `UiCommand` discriminated union. No `.max()` on the array — the
container caps what it renders; the parser never drops a command over length.

### Store — `lib/agent-ui/ui-view-store.ts`

New state, parallel to `view` like `bookingSummary` and `itinerarySummary`:

```ts
agentSuggestions: SuggestionPill[] | null; // null = no override → static fallback
```

- The `show_suggestions` case maps wire → `SuggestionPill`:
  `{ id, label: label ?? text, message: text }`. An **empty `suggestions` array
  maps to `null`** (clears the override, static fallback returns).
- **Cleared on view change:**
  - Commands that replace the view wholesale (`show_discovery_canvas`,
    `show_itinerary_options`, `show_destination_detail`, `show_cabin_options`)
    reset `agentSuggestions` to `null`.
  - `setViewFromUser` / `setViewFromDev` reset it only when `view.type` changes —
    the user's tab switch inside the itinerary re-sets the same view type and must
    keep the pills.
  - Field-level commands (`show_city_detail`, `show_experience_detail`,
    `show_itinerary_tab`, `show_cabin_detail`) keep them.
- New dev action `setAgentSuggestionsFromDev(pills | null)`, mirroring
  `setBookingSummaryFromDev`.

### Container — `components/agent-ui/suggestion-pills.tsx`

- `pills = agentSuggestions ?? pillsForView(view.type, suggestionPills)` — backend
  pills override the static catalog when present; otherwise the current behavior
  is unchanged.
- Render at most **6** pills (contract doc: more is visual noise). Slice at render,
  never at parse.
- A newly arrived `show_suggestions` **resets the dismissed state** of the row, so
  fresh agent suggestions always show even if the user dismissed the previous set
  on the same view.

### Dev support

- Mock in `lib/dev/mocks.ts` (a `show_suggestions`-shaped pill set referencing the
  mock itinerary's cities).
- One entry in `lib/dev/dev-panel.tsx` to push/clear agent suggestions, following
  the booking-summary pattern.

## 2. Command drift fixes

All three currently fail `safeParse` and are dropped by `dispatchEnvelope`
(`transport.ts:33-58`).

### `add_experience_to_basket`

Backend sends `{experience_id}` only (`select_experience.py:193`); frontend
requires `day` and `passenger_count`. Fix: make `day` and `passenger_count`
optional. Reducer records into `addedExperiences` only when `day` is present;
without it there is nothing to key the day badge on, and
`sync_itinerary_experiences` (sent in the same batch) remains the source of truth
that marks the cards.

### `soft_redirect`

Backend sends `{reasonCode, suggestedIntent}`; frontend expects
`{reason_code, missing}`. Fix: the payload schema accepts both spellings and
normalizes to `reason_code` (preprocess). `missing` stays optional;
`suggestedIntent` is ignored (unknown keys already are). Store and `HintOverlay`
unchanged.

### `set_booking_summary` slots cap

The backend emits one slot per basket experience with **no cap**
(`_booking_summary_ui.py:136-150`), while the frontend schema enforces
`.max(6)` (`commands.ts:111`). With itinerary + cabin + 5+ experiences the whole
command is dropped and the summary silently stops updating. Fix: remove
`.max(6)`. The component already renders whatever arrives; no render cap added
(backend curates the list).

## 3. Contract doc update

`docs/2026-07-18-excursions-navigation-contract.md`:

- Summary table: mark the frontend side of §0–§3 and §5 as done.
- Annex B: note both commands now parse on the frontend (accepting today's backend
  shapes), and add the newly found `set_booking_summary` slots-cap drift as fixed.

## Error handling

No new paths. A malformed `show_suggestions` is dropped by `transport.ts` like any
other command, and the static fallback guarantees the pills row never goes blank.

## Testing

- `commands.test.ts`: `show_suggestions` parses (with and without `label`);
  `add_experience_to_basket` parses with only `experience_id`; `soft_redirect`
  parses in both spellings and normalizes; `set_booking_summary` parses with >6
  slots.
- `ui-view-store.test.ts`: `show_suggestions` sets mapped pills; empty array
  clears to `null`; view-replacing commands clear; `show_itinerary_tab` and
  user tab switch keep; `add_experience_to_basket` without `day` records nothing.
- Container: agent pills override static; fallback when `null`; render cap at 6;
  new suggestions reset dismissal. (Component tests live next to the container if
  a test file exists; otherwise covered via store + pills selector tests.)
