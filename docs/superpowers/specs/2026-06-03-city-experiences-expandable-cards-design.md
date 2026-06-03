# City experiences as expandable cards — design

## Problem

When a city detail is opened on the map, its experiences are currently rendered
inside the main detail card (`city-detail-card.tsx`), stacked under the day
descriptions. We want experiences to live **outside** the main card, shown as a
separate column of expandable cards alongside the detail card.

## Goal

Opening a city detail shows two things **simultaneously**, side by side:

- **Left:** the existing city detail card (image, name, country, `day_details`
  Day 01/Day 02 descriptions) — unchanged except that experiences are removed
  from it.
- **Right:** a column of expandable **experience cards** — one per experience.
  The first card starts expanded; the rest start collapsed. If there is only one
  experience, that single card is expanded.

Experience cards must **not** show day labels (no "Day 1 / Day 2"). Only the
experiences themselves.

If the city has no experiences, only the detail card is shown (centered, as
today).

## Out of scope

- Wiring Confirm/Reject to the agent. Those buttons are visual **stubs** for now;
  how decisions are sent to the agent is not yet defined.
- Re-introducing the removed add-ons decision store / machinery.

## Data model

`lib/agent-ui/commands.ts` — add an optional `images` field to `Experience`:

```ts
export const Experience = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  venue: z.string().nullable(),
  description: z.string(),
  images: z.array(z.string()).optional(), // new — backend does not send it yet
});
```

`images` is optional because the backend payload does not include it yet. Cards
render a gallery only when `images` is present and non-empty.

**Test (`commands.test.ts`):** the `Experience` schema parses both with and
without `images`.

## Mocks

`lib/dev/mocks.ts` — add `images: [...]` (reuse existing cloudinary URLs already
in the file) to the Danube Legends experiences, so the gallery is visible in the
dev panel.

## Components

All new files under `components/panels/map/`.

### `experience-card.tsx` (`'use client'`)

A single expandable card.

- **Props:** `{ experience: Experience; defaultExpanded: boolean }`.
- **State:** local `useState(defaultExpanded)` for expanded/collapsed. Each card
  toggles independently (not an accordion — multiple may be open at once).
- **Collapsed:** name + venue + chevron-down. Header row is clickable to expand.
- **Expanded:** image gallery (when `images` present, following the
  `cabin-detail-gallery.tsx` pattern) + name + venue + description +
  chevron-up + **Confirm / Reject** stub buttons.
- **Confirm/Reject:** present but stubbed — empty handlers with a `// TODO`
  noting the agent wiring is undefined. No store, no network.

### `city-experiences-panel.tsx`

The right-hand column.

- **Props:** `{ experiences: Experience[] }`.
- Renders a small "Experiences" heading and maps each experience to an
  `ExperienceCard` with `defaultExpanded={index === 0}`.
- No day labels.
- Scrollable, capped to the same max height as the detail card.

## Layout changes

### `city-detail-card.tsx`

- Remove the experiences block (current lines ~57–72). `day_details` stay.
- Remove the self-contained positioning wrapper (`absolute inset-0 flex
  items-center justify-center …`); the component returns just its `Card`. The
  overlay/positioning moves up to `panel-map.tsx`.

### `panel-map.tsx`

- Render a single overlay container that holds both cards side by side:

  ```tsx
  {detailCity && (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
      <CityDetailCard city={detailCity} onClose={handleClose} />
      {detailCity.experiences && detailCity.experiences.length > 0 && (
        <CityExperiencesPanel experiences={detailCity.experiences} />
      )}
    </div>
  )}
  ```

- Preserve the `pointer-events-none` (wrapper) / `pointer-events-auto` (cards)
  pattern so the map stays interactive around the cards.

## Decisions

- **Independent toggle:** first card expanded by default; user may open/close
  any number independently (not single-open accordion).
- **Gallery only when expanded.**
- **Heading "Experiences"** on the column (not "Available add-ons" — add-ons were
  removed).

## Testing

Per `conventions/testing.md`, only `lib/**/*.test.ts` is collected; React
components are verified visually in the dev panel.

- **Automated:** schema test for `Experience` with/without `images` in
  `commands.test.ts`.
- **Manual:** verify the two-card layout, first-expanded behavior, single vs.
  multiple experiences, and the no-experiences (detail-card-only) case in the
  dev panel.
