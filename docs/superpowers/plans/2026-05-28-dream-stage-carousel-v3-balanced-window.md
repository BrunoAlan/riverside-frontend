# Dream Stage Carousel v3 (Balanced Windowed Panels, Crossfade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dream stage always balanced and circular — a wide focus panel fixed in the centre with an equal number of narrow side strips on each side, the images rotating circularly, advancing with a crossfade in place (no sliding).

**Architecture:** Rewrite `components/panels/dream/panel-dream.tsx`. Render a fixed window of 5 slots (centre + 2 each side) with static widths (centre wide, sides narrow via `flex-grow` + `object-cover`). The panel shown in each slot is computed by circular (modulo) indexing around `activeIndex`, so the centre slot always shows the active image and both sides always have the same count. A `setInterval` advances `activeIndex` circularly; clicking a slot rotates that image to the centre. Each advance crossfades the image inside every slot via `AnimatePresence` (panels stay put). Reuses the tested `buildDreamSlides` helper. No Embla.

**Tech Stack:** React client component, `motion/react` (`AnimatePresence` crossfade), Tailwind, Next.js `Image`, existing `lib/agent-ui/dream-slides.ts`. No new dependencies.

---

## File Structure

- **Modify (full rewrite):** `components/panels/dream/panel-dream.tsx` — the only file changed.
- **Unchanged:** `lib/agent-ui/dream-slides.ts` + `.test.ts`; `components/agent-ui/views/dream-stage-view.tsx` (renders `<PanelDream images={view.images} />`; keep named export `PanelDream`).

---

## Task 1: Rewrite PanelDream as a balanced windowed crossfade carousel

**Files:**
- Modify (full rewrite): `components/panels/dream/panel-dream.tsx`

> No component unit test (per `conventions/testing.md`). Verification = `pnpm lint` clean +
> `pnpm test` (full suite) green.

- [ ] **Step 1: Replace the entire contents of `components/panels/dream/panel-dream.tsx` with:**

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';

const SIDE_PANELS = 2;
const WINDOW = SIDE_PANELS * 2 + 1; // 5 slots: centre + 2 each side
const MIN_PANELS = WINDOW;
const AUTOSCROLL_MS = 3500;
const RESUME_AFTER_MS = 5000;

// flex-grow weight by distance from the centre slot (focus dominant, sides narrow).
const GROW_BY_DISTANCE = [8, 1.6, 0.9];

function growWeight(distance: number): number {
  return GROW_BY_DISTANCE[distance] ?? GROW_BY_DISTANCE[GROW_BY_DISTANCE.length - 1];
}

interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  const panels = useMemo(() => buildDreamSlides(images, MIN_PANELS), [images]);

  // Index (into panels) shown in the centre slot.
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the first image when the image set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [panels.length]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAutoscroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoscroll = useCallback(() => {
    if (intervalRef.current || panels.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % panels.length);
    }, AUTOSCROLL_MS);
  }, [panels.length]);

  const pauseThenResume = useCallback(() => {
    stopAutoscroll();
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(startAutoscroll, RESUME_AFTER_MS);
  }, [stopAutoscroll, startAutoscroll]);

  useEffect(() => {
    startAutoscroll();
    return () => {
      stopAutoscroll();
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [startAutoscroll, stopAutoscroll]);

  const handleSlotClick = useCallback(
    (panelIndex: number) => {
      setActiveIndex(panelIndex);
      pauseThenResume();
    },
    [pauseThenResume],
  );

  if (panels.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  const slots = Array.from({ length: WINDOW }, (_, slot) => {
    const panelIndex = (activeIndex - SIDE_PANELS + slot + panels.length) % panels.length;
    return { slot, panelIndex, panel: panels[panelIndex] };
  });

  return (
    <div className="bg-beige-200 flex h-full w-full items-center justify-center gap-3 overflow-hidden p-6">
      {slots.map(({ slot, panelIndex, panel }) => {
        const distance = Math.abs(slot - SIDE_PANELS);
        const isFocused = slot === SIDE_PANELS;

        return (
          <button
            key={slot}
            type="button"
            onClick={() => handleSlotClick(panelIndex)}
            aria-label={panel.caption}
            style={{ flexGrow: growWeight(distance) }}
            className="relative h-[70%] min-w-[40px] basis-0 overflow-hidden rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-beige-600 focus-visible:ring-offset-2"
          >
            <AnimatePresence>
              <motion.span
                key={panelIndex}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 block"
              >
                <Image
                  src={panel.url}
                  alt={panel.caption}
                  fill
                  sizes="(max-width: 768px) 80vw, 45vw"
                  className="object-cover"
                />

                {isFocused && (
                  <span className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs text-white backdrop-blur-md">
                    {panel.caption}
                  </span>
                )}
              </motion.span>
            </AnimatePresence>
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
`motion/react`, switch to `import { AnimatePresence, motion } from 'framer-motion';` (both are
installed).

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
git commit -m "feat(dream): balanced windowed carousel with crossfade"
```

---

## Task 2: Manual visual verification & tuning (user)

**Files:** `components/panels/dream/panel-dream.tsx` (tuning only, if needed).

> Per project memory, browser/visual verification is left to the user unless explicitly
> requested.

- [ ] **Step 1: Run the dev server and open the dream stage**

Run: `pnpm dev`, open the app, trigger the `dream_stage` view from the dev panel for both
mocks: `Vienna detail (4 images)` and `Vienna detail (2 images)`.

- [ ] **Step 2: Confirm the behaviours match the reference (img #4)**

Check:
- The focus is always the wide centre panel, with **2 narrow strips on each side** —
  symmetric and balanced at all times, including the first paint and at every step.
- Advancing every ~3.5s rotates the images **circularly** (the first eventually becomes the
  last); the layout never goes off-centre or unbalanced.
- The transition is a **crossfade in place** (images dissolve; panels do not slide).
- Clicking a side strip rotates that image to the centre; autoscroll pauses then resumes
  after ~5s.
- The caption pill shows only on the centre panel and fades with the crossfade.
- The 2-image mock still fills all 5 slots (cloned panels), balanced.

- [ ] **Step 3 (optional): Tune constants in `panel-dream.tsx`**

Adjust and re-check if needed:
- `GROW_BY_DISTANCE` — relative slot widths (raise `[0]` for a more dominant focus; lower the
  others for thinner side strips).
- `SIDE_PANELS` — how many strips per side (2 → 5 slots; 3 → 7 slots). `WINDOW`/`MIN_PANELS`
  follow automatically.
- `h-[70%]` — strip height.
- the `transition.duration` (0.5) — crossfade speed; `scale` 1.03 — incoming pop.
- `AUTOSCROLL_MS` / `RESUME_AFTER_MS` — cadence and resume delay.

---

## Self-Review Notes

- **Spec coverage:** always-balanced centred window (Task 1 `slots` modulo indexing, centre
  slot = `SIDE_PANELS`); equal side count (symmetric `distance`); circular wrap (modulo +
  `(i+1)%length`); crossfade in place (Task 1 `AnimatePresence` + `motion.span` opacity/scale,
  static slot widths); wide focus + narrow strips (Task 1 `growWeight` + `object-cover`);
  autoscroll + click-to-centre + pause/resume + cleanup (Task 1 handlers/effects); caption
  centre-only fading with crossfade (Task 1, caption inside the focused slot's `motion.span`);
  focus ring (Task 1 className); reuse helper with `MIN_PANELS` (Task 1); Embla removed
  (Task 1 + Step 2); responsive via fixed weights (Task 1 + Task 2 tuning); no component test,
  helper test untouched. All covered.
- **Out-of-bounds safety:** `activeIndex` is always normalised through `% panels.length` when
  computing `panelIndex`, so even the one render before the reset effect fires after a length
  change cannot produce an invalid index. No clamp needed.
- **Placeholder scan:** none — full component code; tuning values are explicit constants.
- **Type consistency:** `buildDreamSlides(images, minCount)` / `DreamSlide.originalIndex` and
  `growWeight(distance)` match prior definitions and usage.
- **Key uniqueness:** outer `key={slot}` is unique per position; inner `key={panelIndex}` is
  unique within a slot's `AnimatePresence` (5 consecutive indices mod N, N ≥ 5, are distinct),
  which is what drives the crossfade.
