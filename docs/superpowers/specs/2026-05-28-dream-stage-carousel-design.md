# Dream Stage Carousel — Design (v3: balanced windowed panels, crossfade)

**Date:** 2026-05-28
**Status:** Approved (revised twice after visual review)

## Goal

Replace the current dream stage with the reference carousel: a **wide focused panel always
in the centre**, flanked by an **equal number of narrower side strips on each side**
(balanced), rotating **circularly** (the first image becomes the last). The focus advances
on a timer and on click; each advance is a **crossfade/morph in place** — panels keep their
positions and the images dissolve to the next state (no horizontal sliding).

## Why this model (history of the two rejected builds)

1. **v1 — Embla sliding filmstrip:** rejected because every image stayed the same landscape
   size and the row could mount off-centre with a left gap.
2. **v2 — expanding panels, fixed DOM order, focus moves across positions:** closer, but
   near the ends it became **unbalanced** (fewer panels on one side) and it was not
   circular.

**v3 fixes the state model:** instead of moving the focus across fixed panels, we keep the
focus **fixed in the centre slot** and **rotate the images through a fixed window of slots**
using circular (modulo) indexing. This guarantees the layout is always centred and balanced
(same number of side strips each side) and wraps around infinitely. The chosen transition is
a **crossfade in place** (not a slide).

## Scope

Full replacement of the current visual treatment. No data-shape changes.

### Files affected

- **`components/panels/dream/panel-dream.tsx`** — rewritten (replaces the v2 expanding-panel
  build). Renders the balanced windowed carousel with crossfade.
- **`components/agent-ui/views/dream-stage-view.tsx`** — unchanged (still renders
  `<PanelDream images={view.images} />`; keep the named export `PanelDream`).
- **`lib/agent-ui/dream-slides.ts`** + **`.test.ts`** — existing tested helper, reused
  unchanged to guarantee a minimum number of panels.
- Data unchanged: `images: DestinationImage[]` (`{ url, caption }`).

### Dependencies

- `motion/react` — already installed (crossfade via `AnimatePresence`). Repo convention is
  the `motion/react` import.
- `embla-carousel-react` — **not used** by this component (stays in `package.json`).
- **No new dependencies.**

## Layout & window model (the core)

- **Constants:** `SIDE_PANELS = 2` → `WINDOW = SIDE_PANELS * 2 + 1 = 5` visible slots
  (centre + 2 each side). `MIN_PANELS = WINDOW`.
- **Panels:** `const panels = buildDreamSlides(images, MIN_PANELS)` (memoized on `images`).
  Guarantees `panels.length >= WINDOW`, so a 2-image destination still fills the row and the
  window always has distinct panels.
- **State:** `activeIndex` — the index (into `panels`) shown in the **centre slot**. Starts
  at 0; re-centres to 0 if the image set changes.
- **Slots:** render exactly `WINDOW` slots. The panel shown in slot `s` (0..WINDOW-1) is
  `panels[(activeIndex - SIDE_PANELS + s + panels.length) % panels.length]`. So the centre
  slot (`s === SIDE_PANELS`) always shows `activeIndex`, with equal panels wrapping in on
  both sides — always balanced, always circular.
- **Container:** full-height, full-width flex row, `items-center justify-center`,
  `overflow-hidden`, small gap and padding.

## Sizing model

Each slot has a **fixed** width based on its position (distance from the centre slot), so the
layout never reflows when the images rotate:

- centre slot: `flex-grow` ~**8** (wide landscape focus).
- distance 1: ~**1.6** (medium strip).
- distance 2: ~**0.9** (narrow strip).

Slots use `flex-basis: 0` + `flex-grow` weight, a fixed height (`h-[70%]`, tunable),
`rounded-3xl overflow-hidden`, and the image is `fill object-cover` so the narrow slots crop
to vertical strips. Because slot widths are static, **there is no width animation** — the
motion comes entirely from the crossfade. Exact weights/height are tunable during visual
verification.

## Transition (crossfade in place)

When `activeIndex` changes, each slot shows a different panel. Inside every slot, an
`AnimatePresence` keyed by the panel's identity crossfades: the outgoing image animates
`opacity 1 → 0` and the incoming `opacity 0 → 1` (both absolutely positioned to overlap),
over ~**0.5s ease-out**. A subtle `scale` (e.g. `1.03 → 1`) on the incoming image adds life.
Panels stay in place; only the imagery dissolves. `mode` is the default (overlapping) so the
crossfade truly overlaps rather than waiting for exit.

## Interaction & autoscroll

- **Autoscroll:** `setInterval` advances `activeIndex` via `(activeIndex + 1) % panels.length`
  every ~**3.5s** (uses a functional state update; guarded against double intervals;
  disabled when `panels.length <= 1`).
- **Click on a slot:** sets `activeIndex` to that slot's panel index (it rotates to the
  centre); pause the interval and **resume after ~5s**.
- **No drag/swipe** (there is no scroll track); tap focuses on mobile.
- **Cleanup:** clear the interval and the resume timeout on unmount.

## Visual details

- **Caption:** only on the centre slot (the focused image), pill style
  `bg-beige-900/60 ... backdrop-blur-md`, fading with the crossfade.
- **Background:** `bg-beige-200`.
- **Focus ring:** each slot is a `<button>` with `aria-label` (the centre/focused caption,
  or the panel caption) and `focus-visible:ring-2 focus-visible:ring-beige-600
  focus-visible:ring-offset-2` (no bare `focus:outline-none`).

## Responsive

- **Desktop:** centre + 2 strips per side (5 slots), as the reference.
- **Mobile:** same 5-slot row; the fixed grow weights keep the focus dominant and side
  strips thin on narrow viewports. Tunable during verification (optionally raise the centre
  weight on small screens).

## Testing

Per `conventions/testing.md`, **React components are not unit-tested** (Vitest collects only
`lib/**/*.test.ts`; UI is verified visually). So:

- **Unit test:** `lib/agent-ui/dream-slides.test.ts` (unchanged) covers the clone-to-fill
  helper.
- **Component:** no unit test for `panel-dream.tsx`. Verified by `pnpm lint`, `pnpm test`
  (suite stays green), and a visual check by the user (4-image and 2-image mocks).

## Non-goals

- No Riverside logo in this component (app chrome renders it).
- No retained "dream" glow/mask aesthetic.
- Caption on side slots (centre only).
- No horizontal sliding animation (crossfade in place was chosen).
