# Design: `sync_itinerary_experiences` event + visible "Added" state

Date: 2026-06-09
Branch: `feat/sync-itinerary-experiences`

## Goal

When the backend tells the frontend which experiences are already part of the
itinerary, the UI must reflect that so the user **knows an experience was already
added and doesn't add it again**. Today the "Added" indicator only shows on an
*expanded* experience card (inside the Confirm button). We will (1) wire a new
inbound command `sync_itinerary_experiences`, and (2) make the "Added" state
visible at all times on the card.

## Wire shape

```json
{
  "type": "sync_itinerary_experiences",
  "payload": {
    "experiences": [
      {
        "experience_id": "signature_vienna_belvedere_palace",
        "name": "Signature Vienna: VIP Evening at Belvedere Palace",
        "day": "Day 5",
        "destination": "",
        "passenger_count": 2
      }
    ]
  },
  "correlationId": "33154a65-61ab-4519-989d-ca9e2c07336a",
  "timestamp": "..."
}
```

Envelope fields are camelCase; payload fields snake_case, matching existing
commands (`commands.ts`).

## Decisions (agreed in brainstorming)

1. **Merge semantics, not replace.** The reducer adds each
   `{experienceId, day}` not already present, reusing the same dedup logic as
   `add_experience_to_basket`. It never removes entries.
2. **Visible "Added" state = badge + subtle accent.** A pill `✓ Added · Day 5`
   in the card header, shown whether the card is collapsed or expanded, plus a
   subtle border/tint accent on added cards. The expanded Confirm button keeps
   its current "Added" + disabled behavior.
3. **Persistence = backend sync only.** State lives in the in-memory zustand
   singleton (`uiViewStore`). Navigating between sections and back keeps it
   (store is not component-local). A full page reload clears it, and the backend
   re-emits `sync_itinerary_experiences` on reconnect to rehydrate. No
   `localStorage`/`persist` — the backend is the single source of truth.

## Schema (`lib/agent-ui/commands.ts`)

```ts
const SyncItineraryExperiences = Base.extend({
  type: z.literal('sync_itinerary_experiences'),
  payload: z.object({
    experiences: z.array(
      z.object({
        experience_id: z.string(),
        name: z.string(),
        day: z.string(),
        destination: z.string(),
        passenger_count: z.number().int(),
      })
    ),
  }),
});
```

Add `SyncItineraryExperiences` to the `UiCommand` discriminated union.

Note: `name`, `destination`, `passenger_count` are validated (so a malformed
payload is rejected) but **not persisted** in the store — the badge only needs
`experience_id` and `day`. We keep them in the schema to document the contract
and stay strict.

## Reducer (`lib/agent-ui/ui-view-store.ts`)

Add a `case 'sync_itinerary_experiences':` to `applyCommand`. It folds the
payload into `addedExperiences`, skipping pairs that already exist:

```ts
case 'sync_itinerary_experiences': {
  const next = [...state.addedExperiences];
  for (const e of cmd.payload.experiences) {
    const exists = next.some(
      (a) => a.experienceId === e.experience_id && a.day === e.day
    );
    if (!exists) next.push({ experienceId: e.experience_id, day: e.day });
  }
  return {
    addedExperiences: next,
    source: 'agent',
    lastCorrelationId: cmd.correlationId,
  };
}
```

`addedExperiences` already flows through `CityExperiencesPanel` → `ExperienceCard`
via `addedDays`, so no new plumbing is needed for the data.

## UI (`components/panels/map/experience-card.tsx`)

The card already receives `addedDays: string[]`. Currently `isAdded` is computed
against the *selected* day only and used inside the expanded footer. Changes:

- Treat the card as "added" when **any** day is added:
  `const isAdded = addedDays.length > 0;` (drives header badge + accent).
  Keep the per-selected-day check for the Confirm button
  (`const isSelectedDayAdded = addedDays.includes(selectedDay);`) so the button
  reflects the dropdown choice exactly as today.
- **Header badge:** when `isAdded`, render a pill next to the experience name:
  `✓ Added · {addedDays.join(', ')}` (e.g. `✓ Added · Day 5`). Uses `CheckIcon`
  + existing `beige`/`primary` tokens; no new colors hardcoded outside theme.
  Visible collapsed and expanded.
- **Accent:** when `isAdded`, swap the card border/background to a subtle accent
  (e.g. a `primary`-tinted border) via `cn(...)`. Subtle, not a full
  dim/transform.
- Confirm button: unchanged (`disabled={isSelectedDayAdded || !selectedDay}`,
  shows "Added" when `isSelectedDayAdded`).

No layout/regrouping of cards; the panel structure stays as-is.

## Dev mock

Add a `sync_itinerary_experiences` entry to `lib/dev/mocks.ts` (alongside the
existing experience mocks at the Belvedere example) so the command can be
exercised from the dev panel.

## Testing

- `commands.test.ts`: valid payload parses; invalid (missing `day`, non-array
  `experiences`, wrong `passenger_count` type) rejects.
- `ui-view-store.test.ts`: applying `sync_itinerary_experiences`
  - adds new `{experienceId, day}` pairs;
  - is idempotent / dedups against existing `addedExperiences` (merge, no dup);
  - does not remove pre-existing entries absent from the payload (merge, not
    replace);
  - sets `lastCorrelationId`.

## Out of scope

- Removing experiences / a `remove_experience` flow.
- Persisting `name`/`destination`/`passenger_count`.
- localStorage persistence.
- Reworking the "Reject" button (still unwired, untouched).
```