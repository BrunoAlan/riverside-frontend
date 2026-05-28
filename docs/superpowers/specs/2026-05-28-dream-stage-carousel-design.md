# Dream Stage Carousel — Design (v4: sliding coverflow, derived from reference video)

**Date:** 2026-05-28
**Status:** Approved (source of truth: user screen-recording, analysed frame-by-frame)

## Goal

Replace the dream stage with the reference carousel from the video: a **wide focused image
always centred**, flanked by an **equal number of progressively narrower vertical strips on
each side** (balanced), looping **circularly**. The carousel advances by **sliding the whole
filmstrip horizontally** — the focused image moves out to the left shrinking while the next
image slides in from the right growing — with the **width of each image interpolating
continuously by its distance from the centre line** (a coverflow effect). The strips are
**cropped** (vertical slivers via `object-cover`), not the full image scaled down.

## Why this model (history)

Three prior builds missed the animation because the written specs guessed at it:

1. **v1 — Embla sliding filmstrip:** rejected — side images stayed full landscape size (no
   width morph) and the row mounted off-centre with a left gap.
2. **v2 — expanding panels, focus moves across fixed DOM positions:** rejected — went
   unbalanced near the ends and was not circular.
3. **v3 — balanced windowed crossfade:** rejected — the real animation is **not** a crossfade
   in place; it is a horizontal slide with a continuous width morph.

**v4 is derived directly from the user's screen recording** (analysed frame-by-frame), not
from prose. The observed mechanics are listed below and are the contract for this build.

## Observed mechanics (the contract)

From the video frames:

- **Horizontal slide, not crossfade.** The entire filmstrip translates left by one position
  each step. Content physically travels: the focus exits toward the left as the next image
  enters from the right.
- **Focus always centred & balanced** — 2 narrow strips each side at rest.
- **Continuous width morph by distance from centre.** Mid-transition the outgoing and
  incoming images are both ~medium width; the centred one is widest; width shrinks smoothly
  with distance from the centre line. Strips are **cropped** vertical slivers (`object-cover`).
- **Circular / infinite loop.**
- **Cadence:** the focus dwells ~**2.5 s** then slides to the next over ~**0.6 s** with an
  **ease-in-out** curve.
- **Caption** (pill, bottom-left) appears only on the centred image and **fades out** as an
  image leaves the centre.
- **Click a strip → it slides to the centre**; autoplay pauses, then resumes after the normal
  dwell.

## Scope

Full replacement of the current visual treatment. No data-shape changes.

### Files affected

- **`components/panels/dream/panel-dream.tsx`** — rewritten (replaces the v3 crossfade build)
  as the sliding coverflow carousel.
- **`components/agent-ui/views/dream-stage-view.tsx`** — unchanged (still renders
  `<PanelDream images={view.images} />`; keep the named export `PanelDream`).
- **`lib/agent-ui/dream-slides.ts`** + **`.test.ts`** — existing tested helper, reused
  unchanged to clone-to-fill a minimum number of slides.
- Data unchanged: `images: DestinationImage[]` (`{ url, caption }`).

### Dependencies

- `motion/react` — already installed; used here for the eased value animation (`animate(...)`)
  that drives the slide. Repo convention is the `motion/react` import.
- **`embla-carousel-react` is NOT used** by this component. Embla requires fixed per-slide
  sizes for its snap math, which is incompatible with "the centred slide is widest and morphs
  as it centres". It stays in `package.json` (unused by this file).
- **No new dependencies.**

## Architecture — custom sliding coverflow

The component renders a **fixed pool of slot nodes** (a window around the focus) absolutely
positioned inside a `relative overflow-hidden` container. A single continuous float `c`
("fractional centre") drives the layout; advancing means animating `c` from `base` to
`base + 1`. Each frame, every slot's **width and left position are computed from its signed
distance to `c`** and written directly to the DOM (no React re-render during the slide). The
images shown in the slots come from React state `base` (changes once per step, ~every 3 s),
so the only React renders are the cheap per-step src swaps.

### Slot ↔ panel mapping (circular)

- `panels = buildDreamSlides(images, MIN_PANELS)` — guarantees `panels.length >= WINDOW` so
  the window never shows duplicates (a 2-image destination clones to fill).
- Render `WINDOW = 2 * WINDOW_HALF + 1` slot nodes (`WINDOW_HALF = 3` → 7 nodes; ~5 visible
  plus off-screen buffer). Slot offset `k ∈ [-WINDOW_HALF, +WINDOW_HALF]`.
- Slot `k` shows `panels[mod(base + k, panels.length)]`.

### The continuous-centre trick (no jump on wrap)

- State `base: number` (integer, in React state) — the panel index currently centred.
- Ref `cRef: number` — the fractional centre. At rest `c === base`.
- Advance: `animate(cRef, base + 1, { duration: 0.6, ease: 'easeInOut' })`. During the slide
  `base` is unchanged and `c ∈ (base, base+1)`; slot `k` has signed distance `d = (base+k) - c`.
- On complete: set `base = base + 1` (React) **and** normalise `cRef = base + 1`. Because the
  post-step layout uses `d = (base+1+k) - (base+1) = k` — identical geometry to the pre-slide
  rest state — while every slot's src has shifted by one, the result is seamless: the image
  that was the right neighbour is now centred, with **no visual jump**.
- `base` grows unbounded (fine); panel lookup is always `mod(base + k, len)`.

### Per-frame layout math

For fractional centre `c` and integer `base = floor at rest` (slot `k=0` is `panels[base]`):

1. For each slot `k`: `d = (base + k) - c`; `width_k = widthFrac(|d|) * containerWidth`.
2. `widthFrac(dAbs)` interpolates a table by distance:
   `WIDTH_FRAC = [0.50, 0.14, 0.06, 0.035]` (index 0 = focus; `dAbs >= 3` → last value);
   linear-interpolate between `floor` and `ceil` for fractional `dAbs`.
3. Cumulative left edges anchored at slot `k=0` left edge `= 0`, walking outward with a fixed
   `GAP` (≈12px): `left[k] = left[k-1] + width[k-1] + GAP` (and the mirror for negative `k`).
4. Centre the fractional point `c`: with `frac = c - base`,
   `pointAtC = lerp(centreOf(slot 0), centreOf(slot 1), frac)` where
   `centreOf(k) = left[k] + width[k]/2`. Shift every slot by `containerWidth/2 - pointAtC`.
5. Write `style.left` and `style.width` per slot. Caption opacity per slot
   `= clamp(1 - 2*|d|, 0, 1)` (1 at centre, 0 by half a step out) → caption shows only on the
   centred image and fades during the slide.

### Timeline & interaction

- **Autoplay:** after each settle, `setTimeout(DWELL_MS ≈ 2500)` → animate to `base + 1`.
- **Click slot `k`:** stop the running animation + clear the pending dwell timer; animate `c`
  to `base + k` (negative `k` slides right, positive slides left); on complete set
  `base += k`, normalise `c`, then resume autoplay after the normal dwell. `k === 0` is a
  no-op.
- **Disabled** when `panels.length <= 1`.
- **Cleanup:** stop the animation, clear the timer, disconnect the `ResizeObserver` on unmount.

### Responsiveness

- Container width is read live (a `ResizeObserver` on the container triggers `layout()`), so
  the fractional widths scale to any viewport. Vertical centring via absolute
  `top-1/2 -translate-y-1/2`, slot height `h-[70%]` (tunable).
- Same 5-visible layout on mobile; `WIDTH_FRAC`/`GAP` tunable during verification.

## Visual details

- **Background:** `bg-beige-200`. Container `relative overflow-hidden`, padding.
- **Slots:** `<button>` absolutely positioned, `rounded-3xl overflow-hidden`, image
  `fill object-cover`. Accessible: `aria-label={caption}`,
  `focus-visible:ring-2 focus-visible:ring-beige-600 focus-visible:ring-offset-2` (no bare
  `focus:outline-none` without a visible alternative).
- **Caption:** pill `bg-beige-900/60 ... backdrop-blur-md` bottom-left, opacity driven by
  distance (centre only).

## Tunable constants (Task 2, user)

`DWELL_MS` (2500), `SLIDE_MS` (600) + ease, `WIDTH_FRAC` table, `GAP`, `WINDOW_HALF`,
slot height (`h-[70%]`), `MIN_PANELS`.

## Testing

Per `conventions/testing.md`, **React components are not unit-tested** (Vitest collects only
`lib/**/*.test.ts`; UI is verified visually):

- **Unit test:** `lib/agent-ui/dream-slides.test.ts` (unchanged) covers the clone-to-fill
  helper.
- **Component:** no unit test for `panel-dream.tsx`. Verified by `pnpm lint`, `pnpm test`
  (suite stays green), and a visual check by the user against the reference video (4-image and
  2-image mocks).

## Non-goals

- No Riverside logo in this component (app chrome renders it).
- No retained "dream" glow/mask aesthetic.
- No crossfade (v3) and no in-place width morph without translation (v2) — the motion is a
  horizontal slide with continuous width morph.
- Captions on side images (centre only, fading).
- No drag/swipe gesture (advance is timer + click).
