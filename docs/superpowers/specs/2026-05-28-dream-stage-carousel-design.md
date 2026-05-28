# Dream Stage Carousel — Design

**Date:** 2026-05-28
**Status:** Approved

## Goal

Replace the current dream stage (animated SVG blob masks in a collage) with a clean
center-focus "coverflow" carousel: a large focused image in the center, partial side
images peeking at each edge, rounded corners. Images autoscroll step-by-step in an
infinite loop; tapping a side image brings it back to center focus.

## Scope

Full replacement of the current visual treatment. No data-shape changes.

### Files affected

- **`components/panels/dream/panel-dream.tsx`** — rewritten. Remove `DreamMask`,
  `DREAM_SLOTS`, the collage layout, and all SVG/glow/mask code. Renders the carousel.
- **`components/agent-ui/views/dream-stage-view.tsx`** — unchanged (still passes
  `view.images` to `PanelDream`).
- **`lib/agent-ui/dream-slides.ts`** + **`lib/agent-ui/dream-slides.test.ts`** — new pure
  helper that clones the image list to fill the carousel, with a unit test. (This is the
  only non-trivial logic and it lives in `lib/` so Vitest collects its test.)
- Data unchanged: `PanelDream` keeps receiving `images: DestinationImage[]`
  (`{ url: string; caption: string }`).

### Dependencies

- `embla-carousel-react` (^8.6.0) — already installed.
- `framer-motion` / `motion` — already installed (caption fade-in).
- **No new dependencies.**

## Component structure

A single client component `PanelDream` mounting Embla.

- **Embla options:** `{ loop: true, align: 'center' }`.
- **Slides:** map over `images`. With few images (mocks have 2 and 4; type allows min 1),
  **clone** the image list until there are at least 5–6 slides so the "2 per side" peek
  and the infinite loop never show gaps. Cloning is visual only — each clone keeps its
  original caption. Embla also clones internally for the loop.
- **State:** `selectedIndex` tracks the focused slide (drives the caption).

## Transition effect (core)

Scale/opacity/blur are driven by **scroll progress**, not CSS class toggling, so side
images grow/shrink smoothly and continuously as the track moves (the premium coverflow
feel).

- On each Embla `scroll` event, compute per-slide distance to center and map to:
  - **`scale`**: 1.0 center → ~0.8 edges.
  - **`opacity`**: 1.0 center → ~0.6 edges.
  - **`blur`**: 0px center → ~2px edges (subtle, clean look).
- Applied via inline `transform` / `filter`, synced frame-by-frame with the scroll.
- **Easing:** smooth ease-out curve on Embla's `duration` so the snap feels elegant, not
  mechanical.
- **Caption:** shown only over the focused slide. Pill style reusing the current
  treatment (`bg-beige-900/60 ... backdrop-blur-md`), fading in via framer-motion when
  the focus settles.

## Autoscroll & interaction

- **Step-by-step autoscroll:** `setInterval` → `emblaApi.scrollNext()` every ~3.5s
  (infinite loop).
- **Click on a slide:** `emblaApi.scrollTo(index)` centers it; pause the interval and
  **resume after ~5s** of inactivity.
- **Drag/swipe:** native via Embla; pauses/resumes the same way as click.
- **Cleanup:** clear interval and remove Embla listeners on unmount.

## Responsive

- **Desktop:** large center focus + 2 side images peeking per side (matches reference).
- **Mobile:** same carousel adapted — 1 side image per side, wider focus, touch swipe.
  Slide sizing via responsive Tailwind classes (`basis-*`).

## Testing

Per `conventions/testing.md`, **React components are not unit-tested** here (Vitest only
collects `lib/**/*.test.ts`; UI is verified visually via the dev panel). So:

- **Unit test:** `lib/agent-ui/dream-slides.test.ts` covers the pure clone-to-fill helper
  (N≥5 untouched, N=2 cloned to ≥5, captions preserved, N=1 handled).
- **Component:** no unit test for `panel-dream.tsx`. Correctness verified by `pnpm lint`,
  `pnpm test` (existing suite stays green) and visual check in the dev panel by the user.

## Non-goals

- No Riverside logo in this component (rendered by the app chrome).
- No retained "dream" glow/mask aesthetic.
- Caption on side slides (focus only).
