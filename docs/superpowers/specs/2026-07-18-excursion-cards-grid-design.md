# Excursions tab: media-card grid

**Date:** 2026-07-18
**Branch:** `feat/excursion-cards-grid`

## Problem

The Excursions tab currently renders a two-column layout: a `CruiseHeroCard` on the
left and a fixed 440px `CityExperiencesPanel` on the right holding collapsible list
rows. Collapsed rows show no image, no day, and no price — the excursion catalogue
reads as a dense list rather than a browsable set of offers.

The target is a wrapping grid of media cards floating over the map: image, day badge,
title, and a `View details` / `Add` footer per card.

## Scope

In scope:

- Replace the Excursions tab body with a wrapping grid of excursion cards.
- New `ExcursionCard` component.
- New `ExcursionDetailDialog` modal behind `View details`.
- Inline day selector on the card when the owning city spans multiple days.
- Delete `CruiseHeroCard`.

Out of scope:

- Any change to `Experience` or `ItineraryCity` in `lib/agent-ui/commands.ts`.
  No `price` field is added; the design does not display a price.
- `components/panels/map/experience-card.tsx` is left untouched. It remains the
  renderer for the map overlay, which is a separate call site.
- The Overview tab, the map itself, and `buildExperienceDayOptions`.

## Architecture

### Component tree

```
excursions-panel.tsx          (rewritten: grid container, no hero, no 440px panel)
└── excursion-card.tsx        (new)
    └── excursion-detail-dialog.tsx  (new)
```

Both new files live in `components/panels/itinerary/`.

`components/ui/dialog.tsx` does not exist yet and must be added via the shadcn CLI
(`pnpm dlx shadcn@latest add dialog`). Per the repo's hard rules it is not
hand-written and not edited afterwards.

### Data flow

`excursions-panel.tsx:23` currently flattens experiences with
`itinerary.cities.flatMap(c => c.experiences)`, discarding the owning city. The card
needs the city to render its day badge, so the flatten changes to preserve it:

```ts
type ExcursionItem = { experience: Experience; city: ItineraryCity }
```

Day options continue to come from `buildExperienceDayOptions(cities)`, which is
unchanged along with its existing tests. The panel passes each card its
`dayOptions: string[]` plus the item.

Added state continues to come from `useAddedExperiences`
(`lib/agent-ui/hooks.ts:12`, shape `Array<{ experienceId; day }>`). No hook changes.

## The card

Fixed width ~260px. House card recipe, matching the four existing call sites:
`bg-beige-50 border-beige-400/50 gap-0 overflow-hidden rounded-2xl p-2 shadow-none`.

Contents top to bottom:

1. **Image** — `h-32`, `rounded-xl overflow-hidden`, `next/image` with `fill` and an
   explicit `sizes`. Source is `experience.images?.[0] ?? experience.image`. When
   neither exists the image block is omitted and the card starts at the title.
2. **Day badge** — the existing `components/shared/days-badge.tsx`, positioned
   `absolute top-1 left-1` over the image, mirroring `city-card.tsx:32`.
3. **Title** — `experience.name`, `text-primary text-base leading-snug font-medium`,
   `line-clamp-2`. Real names run long
   (`"Signature Budapest: Private Concert at Wenckheim Palace"`), so two lines is the
   deliberate cap.
4. **Footer** — `View details` (ghost button) on the left; on the right an inline day
   `<select>` rendered only when `dayOptions.length > 1`, then `Add` (secondary
   button).

### Day badge label

A new helper `formatDayBadge(days: string[]): string` derives the badge text from the
day options, so the badge and the selector always agree:

| Input                                  | Output           |
| -------------------------------------- | ---------------- |
| `['Day 1']`                            | `Day 1`          |
| `['Day 1', 'Day 3']`                   | `Days 1 & 3`     |
| `['Day 1', 'Day 2', 'Day 6', 'Day 7']` | `Days 1, 2 +2`   |
| `[]`                                   | badge not rendered |

Rule: one day renders singular; two render joined with `&`; three or more render the
first two comma-separated followed by `+N` where N is the remaining count. This keeps
the badge to a single short line regardless of how many days a city spans.

`ItineraryCity.days` is a required non-empty string and `parseCityDays` falls back to
the raw string when it contains no digits, so `dayOptions` is non-empty in practice.
The empty case is a defensive fallback only: no badge, no selector, and `Add` is
disabled.

The helper lives in `lib/map/format-day-badge.ts` alongside `parse-city-days.ts`.

### Added state

When the experience appears in `useAddedExperiences`:

- The card border becomes `border-primary/40 border-2`.
- The `Add` button is replaced by a non-interactive added indicator showing the
  confirmed day.
- The inline day selector is hidden.

The full-width "Added" ribbon and the one-shot flash overlay from `experience-card`
are deliberately not carried over — they were designed for a 440px row and break the
composition of a 260px card in a grid.

## The detail dialog

`View details` opens a centered dialog containing:

- Image gallery — hero image plus a thumbnail strip, reusing the interaction from
  `experience-card.tsx:161-191` (active thumb gets `ring-primary ring-2`).
- `experience.name` as the dialog title, `experience.venue` beneath it when non-null.
- Full `experience.description`.
- The same day selector and `Add` action as the card footer, so a user who opens
  details can complete the add without closing the dialog.

Dialog open state is local to `ExcursionCard`.

## Grid and scrolling

The panel body is `flex flex-wrap gap-3` with padding, content aligned to the top
left, floating over the still-mounted map. When cards overflow the available height
the container scrolls, with the same top and bottom gradient fades used by
`city-experiences-panel.tsx:48,73`.

The existing tab-visibility mechanism in `itinerary-panel.tsx:41-49`
(`pointer-events-none opacity-0` + `inert` when inactive) is unchanged.

## Testing

- `lib/map/format-day-badge.test.ts` — covers the four label cases in the table
  above, following the style of `build-experience-day-options.test.ts`.
- A test for the experience→city pairing produced by the rewritten flatten in
  `excursions-panel.tsx`, asserting each item carries its owning city.

Tests sit next to the code they cover, per the repo convention.

## Verification

1. `pnpm lint` and `pnpm test` pass.
2. In the dev mock itinerary, the Excursions tab shows four cards (three Budapest,
   one Vienna) in a wrapping grid with no hero card.
3. A Budapest card shows the badge `Days 1, 2 +2` and an inline day selector; the
   Vienna card's badge and selector reflect its own city days.
4. `View details` opens the dialog with the gallery and full description; adding from
   the dialog updates the card to its added state.
