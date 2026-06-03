# Experiences panel scroll fix — design

## Problem

When a city detail is open, the experiences column (`CityExperiencesPanel`)
renders all experience cards in a single scrolling div
(`max-h-[85vh] overflow-y-auto`) with the "Experiences" heading inside it. On the
card with the most content (long title + gallery + thumbnails + long
description + Confirm/Reject footer), the expanded card is tall enough that the
**Confirm/Reject footer gets clipped at the bottom edge** instead of being
reachable. It only happens on that one tall card; shorter cards fit.

## Goal

- The experiences column is bounded to the viewport (~85vh) and **never overflows
  past the bottom of the window**.
- The "Experiences" heading stays **fixed** at the top.
- The list of cards **scrolls internally** below the heading, with the
  **scrollbar hidden**.
- The Confirm/Reject footer of any card is always reachable by scrolling — never
  clipped by the window edge.

## Out of scope

- No change to `ExperienceCard` (its layout, gallery, or footer stay as-is).
- No change to the accordion behavior, the `Experience` schema, mocks, or tests.
- No change to `panel-map.tsx` or `city-detail-card.tsx`.

## Approach

Mirror the established pattern in `city-detail-card.tsx`, which fixes its image +
header (`shrink-0`) and scrolls only its body (`overflow-y-auto`). Apply the same
split to `CityExperiencesPanel`: a height-bounded outer container, a fixed
heading, and an internally-scrolling list.

Rejected alternative: keep the single scrolling div and only hide the scrollbar.
That leaves the current structure (heading inside the scroll, no
fixed/scroll split) which is what lets the footer fall past the viewport — it
would not reliably fix the clipping.

## Changes

### `styles/globals.css`

Add a Tailwind v4 utility (none exists today; the file uses `@import
'tailwindcss'` and has other `@utility`/`@layer` blocks):

```css
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

This hides the scrollbar in Firefox (`scrollbar-width: none`) and
Chrome/Safari/Edge (`::-webkit-scrollbar { display: none }`) while keeping the
element scrollable.

### `components/panels/map/city-experiences-panel.tsx`

Restructure the JSX into an outer bounded container, a fixed heading, and an
inner scroll area. The card mapping is unchanged.

```tsx
<div
  className="pointer-events-auto flex max-h-[85vh] flex-col gap-3"
  style={{ width: PANEL_WIDTH }}
>
  <p className="text-muted-foreground shrink-0 px-2 text-xs tracking-wide uppercase">
    Experiences
  </p>
  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 scrollbar-hide">
    {experiences.map((experience) => (
      <ExperienceCard
        key={experience.id}
        experience={experience}
        expanded={experience.id === openId}
        onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
      />
    ))}
  </div>
</div>
```

Key points:

- Outer container: `max-h-[85vh] flex flex-col gap-3` — bounds total height,
  does not scroll itself.
- Heading: `shrink-0` — stays fixed at the top.
- Scroll area: `min-h-0 flex-1 overflow-y-auto scrollbar-hide`. `min-h-0` is
  required so the flex child can shrink below its content height and scroll
  internally instead of pushing content past the bottom; `flex-1` lets it take
  the remaining bounded height.

The `'use client'`, `useState`, `PANEL_WIDTH`, and `openId` logic are unchanged.

## Testing

Per `conventions/testing.md`, only `lib/**/*.test.ts` is collected; React
components are verified visually. No `lib/` logic changes here.

- **Automated:** `pnpm lint` clean.
- **Manual (dev panel):**
  - The "Experiences" heading stays fixed while the cards scroll under it.
  - No visible scrollbar on the column.
  - The tall card's Confirm/Reject footer is reachable by scrolling and is not
    clipped by the window bottom.
  - Short/single-card cases still look correct (no unwanted scrollbar when the
    content fits).
