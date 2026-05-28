# Dream Stage Carousel — Design (v2: expanding panels)

**Date:** 2026-05-28
**Status:** Approved (revised after first visual review)

## Goal

Replace the current dream stage (animated SVG blob masks in a collage) with the
center-focus **expanding-panels** carousel from the reference design: a wide focused
panel in the center and progressively narrower side panels cropped to vertical strips,
all rounded, filling the width and always centered (no gaps). The focus advances on a
timer in an infinite loop; clicking a side panel makes it the focus.

## Why expanding panels (not a sliding/coverflow carousel)

The first build used a sliding Embla "filmstrip" where every image kept the same
landscape size. It was rejected: the side images must read as clearly smaller **vertical
strips** and the layout must always be centered. An expanding-panels layout matches the
reference exactly:

- The whole row fills the container width via flex, so it is always centered with no
  left/right gap (this fixes the "starts on the first photo, empty space on the left"
  bug directly — there is no scroll position to be off-center).
- Side panels are narrow; with a fixed height and `object-cover` they crop to vertical
  strips, exactly like the reference.
- The "movement" is a smooth **width morph**: the focused panel grows while the others
  shrink. The focus advancing across the row reads as motion.

Tradeoff accepted by the user: the loop wrap (focus jumping from the last panel back to
the first) is a width morph rather than a seamless filmstrip slide.

## Scope

Full replacement of the current visual treatment. No data-shape changes.

### Files affected

- **`components/panels/dream/panel-dream.tsx`** — rewritten. Remove the Embla carousel
  from the v1 build (and the original `DreamMask`/`DREAM_SLOTS`/SVG code is already gone).
  Renders the expanding-panels carousel.
- **`components/agent-ui/views/dream-stage-view.tsx`** — unchanged (still passes
  `view.images` to `PanelDream`).
- **`lib/agent-ui/dream-slides.ts`** + **`lib/agent-ui/dream-slides.test.ts`** — existing
  pure helper (already built and tested) is reused to guarantee a minimum number of
  panels. No change to the helper; it is just called with a smaller `minCount`.
- Data unchanged: `PanelDream` keeps receiving `images: DestinationImage[]`
  (`{ url: string; caption: string }`).

### Dependencies

- `framer-motion` / `motion` — already installed (caption fade-in).
- `embla-carousel-react` — **no longer used** by this component (the rewrite removes the
  import). It stays in `package.json` (may be used elsewhere later); we do not uninstall.
- **No new dependencies.**

## Component structure

A single client component `PanelDream`.

- **Panels:** `const panels = buildDreamSlides(images, MIN_PANELS)` with `MIN_PANELS = 5`.
  `buildDreamSlides` repeats whole cycles until there are at least `MIN_PANELS` slides, so
  a 2-image destination still yields a full strip while a 4- or 5-image one is left
  essentially as-is. Each panel carries its `originalIndex` (stable caption identity).
- **State:** `activeIndex` (the focused panel; starts at the middle of the row so the
  carousel mounts centered with neighbours on both sides) and a `ready` flag is **not**
  needed here — the flex layout is centered at first paint, so there is no gap flash.
- **Layout:** a full-height, full-width flex row, `items-center justify-center`,
  `overflow-hidden`. Each panel is a flex child whose width is driven by its distance from
  `activeIndex`.

## Sizing model (the core of the look)

Each panel gets a `flex-grow` weight based on its distance from the active index, with
`flex-basis: 0` and a small `min-width`, plus a fixed height and `object-cover` so narrow
panels crop to vertical strips:

- distance 0 (focus): grow weight ~**8** (wide landscape).
- distance 1: grow weight ~**1.6** (medium strip).
- distance 2: grow weight ~**0.9** (narrow strip).
- distance ≥ 3: grow weight ~**0.5** (sliver) — or, if the row has many panels, these may
  effectively disappear at the edges; that is fine.

All panels share a fixed height (e.g. `h-[70%]` of the stage, tunable) and
`rounded-3xl overflow-hidden`. The width change animates via a CSS transition on flex
(`transition-[flex-grow]` / `transition-all`, ~**700ms ease-out**) so growing/shrinking is
smooth. Distance is the simple linear `Math.abs(index - activeIndex)` (no wraparound):
panels keep their position; only the active one moves, which keeps the morph readable.

Exact weights/heights are **tunable during visual verification** — the spec fixes the
approach, not the pixel values.

## Interaction & autoscroll

- **Autoscroll:** `setInterval` advances `activeIndex` every ~**3.5s**, wrapping with
  `(activeIndex + 1) % panels.length` (infinite loop).
- **Click on a panel:** sets `activeIndex` to that panel; pause the interval and **resume
  after ~5s** of inactivity.
- **No drag/swipe** (there is no scroll track in this layout); on mobile, tapping a panel
  focuses it. This is acceptable and simpler than the v1 Embla behaviour.
- **Cleanup:** clear the interval and the resume timeout on unmount.

## Visual details

- **Caption:** shown only over the focused panel, pill style reusing the current
  treatment (`bg-beige-900/60 ... backdrop-blur-md`), fading in via framer-motion
  (`AnimatePresence` + `motion.span`) when the focus settles.
- **Background:** `bg-beige-200` (as today).
- **Focus ring:** the clickable panel is a `<button>` with `aria-label={caption}` and a
  `focus-visible:ring-2 focus-visible:ring-beige-600 focus-visible:ring-offset-2` ring
  (no bare `focus:outline-none`).

## Responsive

- **Desktop:** wide focus + 2 narrower strips peeking per side (matches the reference).
- **Mobile:** the same flex row; with the same grow weights the focus naturally dominates
  and side strips get thinner on a narrow viewport. Optionally bump the focus weight on
  small screens so it stays prominent. Tunable during verification.

## Testing

Per `conventions/testing.md`, **React components are not unit-tested** here (Vitest only
collects `lib/**/*.test.ts`; UI is verified visually via the dev panel). So:

- **Unit test:** `lib/agent-ui/dream-slides.test.ts` already covers the pure clone-to-fill
  helper (untouched in this revision).
- **Component:** no unit test for `panel-dream.tsx`. Correctness verified by `pnpm lint`,
  `pnpm test` (existing suite stays green) and a visual check in the dev panel by the user
  (mocks: 4-image and 2-image dream_stage).

## Non-goals

- No Riverside logo in this component (rendered by the app chrome).
- No retained "dream" glow/mask aesthetic.
- Caption on side panels (focus only).
- No seamless infinite *sliding* (the loop is a width morph; accepted tradeoff).
