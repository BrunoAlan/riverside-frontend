# Dream Stage Carousel v4 (Sliding Coverflow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dream stage as a sliding coverflow carousel that matches the reference video — a wide focus always centred, narrower cropped strips each side, the whole filmstrip sliding horizontally one step at a time with each image's width morphing continuously by its distance from the centre, looping circularly.

**Architecture:** Full rewrite of `components/panels/dream/panel-dream.tsx`. A fixed pool of `WINDOW` slot `<button>`s is absolutely positioned in a `relative overflow-hidden` container. A continuous float `c` (the "fractional centre") drives a per-frame `layout()` that writes each slot's `width`/`left`/caption-opacity straight to the DOM. Advancing animates `c` from `base` to `base + 1` via `animate()` from `motion/react`; on complete, React state `base` increments and `c` normalises, so the wrap is seamless (post-step geometry equals the pre-slide rest geometry while srcs shift by one). Slot `k` shows `panels[mod(base + k, len)]`; `panels` comes from the existing tested `buildDreamSlides` helper. No Embla.

**Tech Stack:** React client component, `motion/react` (`animate`), Tailwind, Next.js `Image`, existing `lib/agent-ui/dream-slides.ts`. No new dependencies.

---

## File Structure

- **Modify (full rewrite):** `components/panels/dream/panel-dream.tsx` — the only file changed.
- **Unchanged:** `lib/agent-ui/dream-slides.ts` + `.test.ts`; `components/agent-ui/views/dream-stage-view.tsx` (renders `<PanelDream images={view.images} />`; keep the named export `PanelDream`).

---

## Task 1: Rewrite PanelDream as a sliding coverflow carousel

**Files:**
- Modify (full rewrite): `components/panels/dream/panel-dream.tsx`

> No component unit test (per `conventions/testing.md`). Verification = `pnpm lint` clean +
> `pnpm test` (full suite) green. Visual verification is Task 2 (user).

- [ ] **Step 1: Replace the entire contents of `components/panels/dream/panel-dream.tsx` with:**

```tsx
'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { animate, type AnimationPlaybackControls } from 'motion/react';
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';

const WINDOW_HALF = 3; // render 3 slots each side of centre (7 nodes; ~5 visible + buffer)
const WINDOW = WINDOW_HALF * 2 + 1;
const MIN_PANELS = WINDOW; // ensure the window never shows duplicate panels
const DWELL_MS = 2500; // focus rest time before sliding to the next image
const SLIDE_MS = 600; // slide duration
const GAP = 12; // px between slots
// width as a fraction of the container, by integer distance from the centre line.
// index 0 = focus (widest); distances >= 3 use the last value. Fractional distances
// interpolate linearly between neighbours.
const WIDTH_FRAC = [0.5, 0.14, 0.06, 0.035];

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function widthFracFor(dAbs: number): number {
  const i = Math.floor(dAbs);
  if (i >= WIDTH_FRAC.length - 1) return WIDTH_FRAC[WIDTH_FRAC.length - 1];
  const frac = dAbs - i;
  return WIDTH_FRAC[i] + (WIDTH_FRAC[i + 1] - WIDTH_FRAC[i]) * frac;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  const panels = useMemo(() => buildDreamSlides(images, MIN_PANELS), [images]);

  // Panel index currently centred. React state because it drives the slot <img> srcs
  // (changes once per step). The smooth motion is driven by cRef, not by re-rendering.
  const [base, setBase] = useState(0);

  const baseRef = useRef(0); // mirrors `base` synchronously for use inside callbacks/animation
  const cRef = useRef(0); // fractional centre; at rest cRef.current === baseRef.current
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const captionRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the first image when the image set changes.
  useEffect(() => {
    baseRef.current = 0;
    cRef.current = 0;
    setBase(0);
  }, [panels.length]);

  // Position + size every slot from the current fractional centre. Writes to the DOM
  // directly (no React re-render) so it is cheap to call every animation frame.
  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const c = cRef.current;
    const b = baseRef.current;

    // width of each slot k in px, keyed by offset from centre.
    const widthOf = (k: number) => widthFracFor(Math.abs(b + k - c)) * w;

    // cumulative left edges, anchoring slot k=0's left edge at 0.
    const left: Record<number, number> = { 0: 0 };
    for (let k = 1; k <= WINDOW_HALF; k++) left[k] = left[k - 1] + widthOf(k - 1) + GAP;
    for (let k = -1; k >= -WINDOW_HALF; k--) left[k] = left[k + 1] - GAP - widthOf(k);

    // align the fractional centre point with the container centre.
    const frac = c - b;
    const centreOf = (k: number) => left[k] + widthOf(k) / 2;
    const pointAtC = centreOf(0) + (centreOf(1) - centreOf(0)) * frac;
    const shift = w / 2 - pointAtC;

    for (let i = 0; i < WINDOW; i++) {
      const k = i - WINDOW_HALF;
      const node = slotRefs.current[i];
      if (node) {
        node.style.width = `${widthOf(k)}px`;
        node.style.left = `${left[k] + shift}px`;
      }
      const caption = captionRefs.current[i];
      if (caption) caption.style.opacity = `${clamp01(1 - 2 * Math.abs(b + k - c))}`;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (panels.length <= 1) return;
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => slideTo(baseRef.current + 1), DWELL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length]);

  const slideTo = useCallback(
    (target: number) => {
      if (target === baseRef.current) {
        scheduleNext();
        return;
      }
      controlsRef.current?.stop();
      if (dwellRef.current) clearTimeout(dwellRef.current);
      controlsRef.current = animate(cRef.current, target, {
        duration: SLIDE_MS / 1000,
        ease: 'easeInOut',
        onUpdate: (v) => {
          cRef.current = v;
          layout();
        },
        onComplete: () => {
          baseRef.current = target;
          cRef.current = target;
          setBase(target); // grows unbounded; only ever read through mod(base + k, len)
          scheduleNext();
        },
      });
    },
    [layout, scheduleNext, panels.length],
  );

  const handleSlotClick = useCallback(
    (k: number) => {
      if (k === 0) return;
      slideTo(baseRef.current + k);
    },
    [slideTo],
  );

  // Initial paint, autoplay start, resize handling, and cleanup.
  useLayoutEffect(() => {
    layout();
    const container = containerRef.current;
    const ro = new ResizeObserver(() => layout());
    if (container) ro.observe(container);
    scheduleNext();
    return () => {
      ro.disconnect();
      controlsRef.current?.stop();
      if (dwellRef.current) clearTimeout(dwellRef.current);
    };
  }, [layout, scheduleNext]);

  // Re-paint geometry after a step's src swap so the new srcs land at rest geometry.
  useLayoutEffect(() => {
    layout();
  }, [base, layout]);

  if (panels.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  return (
    <div
      ref={containerRef}
      className="bg-beige-200 relative h-full w-full overflow-hidden"
    >
      {Array.from({ length: WINDOW }, (_, i) => {
        const k = i - WINDOW_HALF;
        const panel = panels[mod(base + k, panels.length)];
        return (
          <button
            key={i}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            type="button"
            onClick={() => handleSlotClick(k)}
            aria-label={panel.caption}
            className="focus-visible:ring-beige-600 absolute top-1/2 h-[70%] -translate-y-1/2 overflow-hidden rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ left: 0, width: 0 }}
          >
            <Image
              src={panel.url}
              alt={panel.caption}
              fill
              sizes="(max-width: 768px) 60vw, 45vw"
              className="object-cover"
            />
            <span
              ref={(el) => {
                captionRefs.current[i] = el;
              }}
              className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 whitespace-nowrap rounded-full px-4 py-2 text-xs text-white backdrop-blur-md"
              style={{ opacity: 0 }}
            >
              {panel.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify there is no Embla import and the motion import matches the repo**

Run: `grep -n "embla\|motion/react\|framer-motion" components/panels/dream/panel-dream.tsx`
Expected: no `embla` line; a single `motion/react` import. If `pnpm lint`/tsc cannot resolve
`animate`/`AnimationPlaybackControls` from `motion/react`, switch the import to
`import { animate, type AnimationPlaybackControls } from 'framer-motion';` (both are installed).

- [ ] **Step 3: Confirm Tailwind tokens exist**

Run: `grep -n "beige-200\|beige-600\|beige-900" styles/globals.css`
Expected: all three present. If `beige-600` is missing, use the nearest existing beige token in
the focus-visible ring.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm lint`
Expected: PASS, no errors in `panel-dream.tsx`.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS — existing suite stays green (68 tests). No new component test.

- [ ] **Step 6: Commit**

```bash
git add components/panels/dream/panel-dream.tsx
git commit -m "feat(dream): sliding coverflow carousel matching reference video"
```

---

## Task 2: Manual visual verification & tuning (user)

**Files:** `components/panels/dream/panel-dream.tsx` (tuning only, if needed).

> Per project memory, browser/visual verification is left to the user unless explicitly
> requested.

- [ ] **Step 1: Run the dev server and open the dream stage**

Run: `pnpm dev`, open the app, trigger the `dream_stage` view from the dev panel for both
mocks: `Vienna detail (4 images)` and `Vienna detail (2 images)`.

- [ ] **Step 2: Confirm the behaviours match the reference video**

Check:
- The focus is always the wide centre image, with **2 narrower cropped strips each side** —
  symmetric and balanced at rest, including first paint (no left gap).
- Every ~2.5 s the filmstrip **slides one step to the left** over ~0.6 s (ease-in-out): the
  focus exits left shrinking, the next image enters from the right growing to centre.
- The motion is a **continuous slide with width morph**, not a crossfade and not an in-place
  morph. Side strips are **cropped** vertical slivers (not the full image shrunk).
- The loop is **circular** (first eventually becomes last); no jump/teleport at the wrap.
- Clicking a side strip slides it to the centre; autoplay pauses then resumes after the dwell.
- The caption pill shows only on the centred image and fades out as it leaves the centre.
- The 2-image mock still fills the window (cloned panels), balanced, no duplicates adjacent.

- [ ] **Step 3 (optional): Tune constants in `panel-dream.tsx`**

Adjust and re-check if needed:
- `WIDTH_FRAC` — image widths by distance (raise `[0]` for a more dominant focus; lower the
  rest for thinner strips). Roughly match the video proportions.
- `GAP` — spacing between images.
- `DWELL_MS` / `SLIDE_MS` — rest time and slide speed; the ease is `'easeInOut'`.
- `h-[70%]` — image height.
- `WINDOW_HALF` — strips per side (3 → 7 nodes). `WINDOW`/`MIN_PANELS` follow automatically.

---

## Self-Review Notes

- **Spec coverage:** horizontal slide not crossfade (Task 1 `animate(cRef, base+1)` driving
  `left`/`width` per frame); focus always centred & balanced (centring shift in `layout()`,
  symmetric `WIDTH_FRAC` by `|d|`); continuous width morph + cropped strips (`widthFracFor` +
  `fill object-cover`); circular loop with no jump (continuous-centre trick: `setBase` +
  `cRef` normalise on complete, slot src via `mod(base+k, len)`); cadence ~2.5 s dwell / ~0.6 s
  ease-in-out (`DWELL_MS`/`SLIDE_MS`); caption centre-only fading (`captionRefs` opacity
  `1 - 2|d|`); click-to-centre + pause/resume (`handleSlotClick` → `slideTo` → `scheduleNext`);
  disabled when `panels.length <= 1` (`scheduleNext` guard); responsive (`ResizeObserver` →
  `layout`); reuse helper with `MIN_PANELS`; Embla removed; no component test, helper test
  untouched. All covered.
- **No-jump argument:** during a step `base` is fixed and `c ∈ (base, base+1)`, slot `k` has
  `d = (base+k) - c`. At completion `base += 1` and `c = base+1`, so `d = (base+1+k) - (base+1)
  = k` — identical geometry to the pre-step rest state — while every src shifts by one. The eye
  sees the former right-neighbour now centred, matching the just-finished slide. No teleport.
- **Out-of-bounds safety:** slot panel lookup is always `panels[mod(base + k, panels.length)]`;
  `base`/`target` may grow unbounded but are only ever used through `mod`, and `cRef` stays near
  `base` so distances are small. `base`/`baseRef` hold the same monotonic value.
- **Placeholder scan:** none — full component code; tuning values are explicit constants.
- **Type consistency:** `buildDreamSlides(images, minCount)` and `DreamSlide` (extends
  `DestinationImage`) match the existing helper; `animate` / `AnimationPlaybackControls` are the
  `motion/react` value-animation API (fallback to `framer-motion` documented in Step 2).
- **Key uniqueness:** slot nodes are keyed by stable position `i` (0..WINDOW-1); their srcs swap
  on `base` change without remounting, which is required for the seamless wrap.
```