# Experience cards — wider/shorter style + accordion expand — design

## Problem

The experience cards in the city detail view (`components/panels/map/`) have two
rough edges:

1. They are the same width as the detail card (380px) and feel tall when
   expanded — the gallery image dominates the card.
2. Each card expands independently, so several can be open at once. We want an
   accordion: opening one collapses the others.

## Goal

- **Wider:** the experiences column grows from 380px to **440px**.
- **Shorter:** the expanded gallery's main image drops from `h-48` (~192px) to
  `h-36` (~144px), the single biggest contributor to card height.
- **Accordion:** at most one card is expanded at a time. Opening a card collapses
  whichever was open. Clicking the already-open card collapses it, leaving **all
  collapsed** (the open card is collapsible). The first card starts expanded.

## Out of scope

- No change to the `Experience` schema, mocks, or `commands.test.ts`.
- No change to `city-detail-card.tsx` or `panel-map.tsx`.
- Confirm/Reject stay stubs (unchanged).

## Approach

Lift the expanded state out of `ExperienceCard` and into
`CityExperiencesPanel`, making the card a **controlled** component. The panel
becomes the single source of truth for which card is open, which makes "only one
open" and "collapsible" both fall out naturally.

Rejected alternative: keep state inside each card and coordinate via shared
callbacks/context — more moving parts for the same behavior.

## Components

### `experience-card.tsx`

- **Props change:** replace `defaultExpanded: boolean` with
  `expanded: boolean` and `onToggle: () => void`.
- Remove the internal `useState(defaultExpanded)`. The component is now
  controlled by `expanded`.
- The toggle `Button`'s `onClick` calls `onToggle` instead of the local setter.
  `aria-expanded` / `aria-label` / chevron rotation continue to read from the
  `expanded` prop.
- **Gallery height:** main image wrapper `h-48` → `h-36`.
- **Image `sizes` hint:** `sizes="380px"` → `sizes="440px"` on the main gallery
  image (the `80px` thumbnail hint is unchanged).
- The `ExperienceGallery`'s local `activeIndex` `useState` stays — it tracks
  which thumbnail is selected and is unrelated to expand/collapse.

### `city-experiences-panel.tsx`

- `PANEL_WIDTH = 380` → `PANEL_WIDTH = 440`.
- Add `const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null)`.
- For each experience, pass:
  - `expanded={experience.id === openId}`
  - `onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}`
- Drop the `defaultExpanded={index === 0}` prop; `index` is no longer needed.
- Mark the component `'use client'` (it now holds state).

## Testing

Per `conventions/testing.md`, only `lib/**/*.test.ts` is collected; React
components are verified visually in the dev panel. This change is behavior +
styling only, with no testable `lib/` logic.

**Manual checks in the dev panel:**

- First card starts expanded, the rest collapsed.
- Opening a collapsed card collapses the previously open one.
- Clicking the open card collapses it, leaving all collapsed.
- Cards are visibly wider (440px) and the expanded gallery is shorter.
- Single-experience case: that one card is expanded and can still be collapsed.
