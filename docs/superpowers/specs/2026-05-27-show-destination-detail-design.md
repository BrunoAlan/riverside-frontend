# `show_destination_detail` — design

**Date:** 2026-05-27
**Branch:** `feat/show-destination-detail-command`
**Status:** Approved (pending implementation plan)

## Context

The agent is emitting a command on the `ui-commands` LiveKit topic that the
frontend doesn't recognise:

```
[ui-commands] command {
  type: 'show_destination_detail',
  correlationId: '9f74b89a-34e7-4596-9144-ead9a649d87d',
  payload: {
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: ['City of Music']
    },
    images: [
      { url: 'https://res.cloudinary.com/.../page_005_image_01.jpg',
        caption: 'SIGNATURE VIENNA: VIP EVENING AT' },
      ...
    ]
  }
}
```

Today the frontend has a `show_dream_stage` command with payload
`{ images: { src, tag }[] }`. That shape was a placeholder invented before the
backend contract existed. The shape above is the real wire format.

The Zod union therefore rejects this command (it never reaches
`applyCommand` once wired — currently `transport.ts` only logs).

## Goal

Make `show_destination_detail` a first-class command that, when received,
puts the user on the existing `dream_stage` view with the real payload.

The view name (`dream_stage`) stays. Only the command name and the data
flowing into the view change.

## Out of scope

- Wiring `applyCommand` into `transport.ts`. The previous commit
  (`ab86ad4`) deliberately deferred the rewire; this change does not touch it.
- Reconciling `correlationId` (camelCase, observed on the wire) vs
  `correlation_id` (snake_case, what the Zod schema currently expects).
  That mismatch will need to be resolved when `applyCommand` is rewired,
  not here. Every other command in the schema uses `correlation_id` today;
  staying consistent until the rewire avoids a half-migration.
- Showing destination metadata (name, country, region, aliases) in the UI.
  The current `PanelDream` design has no slot for it. We store the
  `destination` in the view state so the panel can use it later, but the
  visible UI is unchanged.

## Changes

### 1. `lib/agent-ui/commands.ts`

Replace `DreamImage` and `ShowDreamStage` with:

```ts
export const Destination = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  region: z.string(),
  aliases: z.array(z.string()),
});
export type Destination = z.infer<typeof Destination>;

export const DestinationImage = z.object({
  url: z.string().url(),
  caption: z.string(),
});
export type DestinationImage = z.infer<typeof DestinationImage>;

const ShowDestinationDetail = Base.extend({
  type: z.literal('show_destination_detail'),
  payload: z.object({
    destination: Destination,
    images: z.array(DestinationImage).min(1).max(5),
  }),
});
```

Swap `ShowDestinationDetail` in for `ShowDreamStage` in the `UiCommand`
discriminated union. Remove the `DreamImage` export.

Image-count bounds (`min(1).max(5)`) are kept from the previous schema:
`PanelDream` slices to its 5 collage slots, so >5 wastes payload and 0
images means there's nothing to render. If the backend regularly sends
more we can revisit, but bounding loudly is better than silently dropping.

### 2. `lib/agent-ui/ui-view-types.ts`

`dream_stage` view gains `destination` alongside `images`, and the image
type is `DestinationImage` instead of `DreamImage`:

```ts
import type { BookingSummarySnapshot, Destination, DestinationImage, ItineraryOption } from './commands';

| { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
```

### 3. `lib/agent-ui/ui-view-store.ts`

Rename the reducer case and pipe both fields through:

```ts
case 'show_destination_detail':
  return {
    view: {
      type: 'dream_stage',
      destination: cmd.payload.destination,
      images: cmd.payload.images,
    },
    hint: null,
    source: 'agent',
    lastCorrelationId: cmd.correlation_id,
  };
```

The exhaustive `never` check at the bottom of the switch will fail the
build until the case name is updated, which is the intended safety net.

### 4. `components/panels/dream/panel-dream.tsx`

Type the prop as `DestinationImage[]`, swap `image.src` → `image.url` and
`image.tag` → `image.caption`. Update the import (`DreamImage` →
`DestinationImage`). No layout, animation, or styling change.

The view component (`dream-stage-view.tsx`) passes `view.images` straight
through; it doesn't need to read `destination` yet.

### 5. `lib/dev/mocks.ts`

Replace the two existing `dream_stage` mocks with realistic shapes built
from the live Vienna payload. One full collage (4–5 images), one partial
(2–3 images) to keep coverage for both layouts.

### 6. Tests

- `lib/agent-ui/commands.test.ts`:
  - Rename `parses show_dream_stage with 1-5 images` →
    `parses show_destination_detail with destination and images`. Assert
    both `destination` and `images` round-trip.
  - Rename and update `rejects show_dream_stage with non-url src` →
    `rejects show_destination_detail with non-url image url`.
  - Rename and update `rejects show_dream_stage with more than 5 images`
    accordingly.
  - Add: `rejects show_destination_detail with missing destination fields`
    (e.g. drop `country`) — guards the new required shape.
- `lib/agent-ui/ui-view-store.test.ts`:
  - Rename `applyCommand(show_dream_stage) maps payload images into view`
    → `applyCommand(show_destination_detail) maps destination and images into view`.
  - Update the `setViewFromDev` dream_stage fixture to include
    `destination` and the new image shape.

## Non-changes

- `transport.ts` — untouched. Still logs only.
- `conventions/*` — no current convention file names this command by
  name; the patterns it documents (snake_case wire, `correlation_id`,
  exhaustive reducer) all still apply.
- Historical specs/plans under `docs/superpowers/{specs,plans}/` and the
  recent `docs/2026-05-{26,27}-*` design docs — left as dated snapshots
  of what was true when they were written.

## Verification

- `pnpm lint` clean.
- `pnpm test` green, including the renamed/added cases above.
- Dev panel: selecting either `dream_stage` mock renders `PanelDream` with
  the new payload (manual check).
