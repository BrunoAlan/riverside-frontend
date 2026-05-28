# Dream Stage Carousel v4.1 (Exactly 5 Visible) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dream carousel show **exactly 5 images** — the centred focus plus 2 strips on each side — with no extra slivers, while keeping the slide animation and circular wrap unchanged.

**Architecture:** No structural change. Only tuning constants in `components/panels/dream/panel-dream.tsx`: render a wider window so there is off-screen buffer to feed the slide (and to cover a 2-step slide when an outer strip is clicked), and resize the slots so the 5 visible images fill the container width while distance-≥3 slots sit off-screen (clipped by the existing `overflow-hidden`).

**Tech Stack:** Unchanged — React client component, `motion/react`, Tailwind, Next.js `Image`, existing `lib/agent-ui/dream-slides.ts`. No new dependencies.

---

## Background (why these specific numbers)

- The visible window is `k ∈ {-2, -1, 0, 1, 2}` (focus + 2 each side = 5 images).
- **Buffer is required:** during a leftward advance a new image must enter from the right edge; rendering only the 5 visible slots would open a gap mid-slide. Clicking an outer strip (`k = ±2`) slides **2 steps**, so 2 levels of buffer are needed on the entering side. Hence `WINDOW_HALF = 4` → 9 nodes: 5 visible + 2 buffer each side. Buffer slots (`|k| ≥ 3`) are positioned off-screen and clipped by `overflow-hidden`.
- **Filling the width:** with `WIDTH_FRAC = [0.5, 0.17, 0.09, 0.07, 0.05]`, the rest-state visible span is `0.5 + 2·0.17 + 2·0.09 = 1.02` of the container width plus gaps, so the outer strips (`k = ±2`) reach/peek past the container edges and the `k = ±3` buffer sits fully outside. Distance-3 width (`0.07`) is close to distance-2 (`0.09`) so a buffer slot grows smoothly into a proper strip as it slides in (its distance goes 3 → 2). Index 4 (`0.05`) covers the outermost buffer.

---

## File Structure

- **Modify:** `components/panels/dream/panel-dream.tsx` — three constant/attribute edits only.
- **Unchanged:** everything else (`dream-slides.ts` + `.test.ts`, `dream-stage-view.tsx`).

---

## Task 1: Tune the carousel to 5 visible images

**Files:**
- Modify: `components/panels/dream/panel-dream.tsx`

> No component unit test (per `conventions/testing.md`). Verification = `pnpm lint` clean +
> `pnpm test` (full suite) green. Visual verification is Task 2 (user).

- [ ] **Step 1: Widen the window to provide buffer for the 5 visible slots**

In `components/panels/dream/panel-dream.tsx`, change:

```ts
const WINDOW_HALF = 3; // render 3 slots each side of centre (7 nodes; ~5 visible + buffer)
```

to:

```ts
const WINDOW_HALF = 4; // 9 nodes: 5 visible (k = -2..2) + 2 off-screen buffer each side
```

`WINDOW`, `MIN_PANELS` derive from `WINDOW_HALF` and update automatically (`WINDOW = 9`, `MIN_PANELS = 9`).

- [ ] **Step 2: Resize the slots so exactly 5 fill the width**

Change:

```ts
const WIDTH_FRAC = [0.5, 0.14, 0.06, 0.035];
```

to:

```ts
// width as a fraction of the container, by integer distance from the centre line.
// index 0 = focus; distances 1 and 2 are the two visible strips per side; distances >= 3
// are off-screen buffer (clipped). Fractional distances interpolate linearly.
const WIDTH_FRAC = [0.5, 0.17, 0.09, 0.07, 0.05];
```

(Leave the explanatory comment block above the constant intact; only the array values and the comment wording change as shown.)

- [ ] **Step 3: Keep all 5 visible slots keyboard-reachable, exclude buffer**

On the slot `<button>`, change:

```tsx
            tabIndex={Math.abs(k) > 1 ? -1 : 0}
```

to:

```tsx
            tabIndex={Math.abs(k) > 2 ? -1 : 0}
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm lint`
Expected: PASS, 0 errors / 0 warnings.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS — suite stays green (68 tests). No new test.

- [ ] **Step 6: Commit**

```bash
git add components/panels/dream/panel-dream.tsx
git commit -m "feat(dream): show exactly 5 images (focus + 2 each side)"
```

---

## Task 2: Manual visual verification & tuning (user)

> Per project memory, browser/visual verification is left to the user unless explicitly requested.

- [ ] Run `pnpm dev`, trigger the `dream_stage` view (both mocks) and confirm:
  - Exactly **5 images** visible at rest: focus centred + 2 strips each side, no thin slivers.
  - The slide still animates smoothly with no gap appearing at the entering edge, including
    when clicking an **outer** strip (`k = ±2`, a 2-step slide).
  - Circular loop and click-to-centre still work; autoscroll starts on load.
- [ ] If proportions are off, tune `WIDTH_FRAC` (raise `[0]` for a more dominant focus; adjust
  `[1]`/`[2]` for strip widths; keep `[3]`/`[4]` near `[2]` so buffer slides in smoothly) and
  `GAP`.

---

## Self-Review Notes

- **Scope:** three edits, one file; animation/wrap/timer logic untouched. `MIN_PANELS = WINDOW
  = 9` keeps the window duplicate-free (`buildDreamSlides` clones to ≥ 9). 9 consecutive
  indices mod N (N ≥ 9) are distinct, so slot keys/srcs stay unique.
- **Buffer adequacy:** 2 buffer slots each side cover the maximum click slide of 2 steps
  (clicking `k = ±2`), so no entering-edge gap. Autoplay (1-step) is trivially covered.
- **Off-screen guarantee:** visible span (≈ 1.02·W + gaps) ≥ container width, so `k = ±3`/`±4`
  fall outside and are clipped by the container's `overflow-hidden`. On very wide viewports the
  gap fraction shrinks; values are tunable in Task 2 if a buffer edge ever peeks.
- **Accessibility:** `tabIndex` now exposes the 5 visible slots (`|k| ≤ 2`) and hides the
  buffer (`|k| ≥ 3`) from the tab order.
- **Placeholder scan:** none — concrete values and exact edits.
