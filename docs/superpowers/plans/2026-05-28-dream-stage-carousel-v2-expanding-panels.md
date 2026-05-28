# Dream Stage Carousel v2 (Expanding Panels) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dream stage as a center-focus expanding-panels carousel — a full-width flex row where the focused panel is wide and side panels are narrow vertical strips, always centered, focus advancing on a timer with click-to-focus.

**Architecture:** Replace the v1 Embla "filmstrip" in `components/panels/dream/panel-dream.tsx` with a flex row of `<button>` panels. Each panel's `flex-grow` is a function of its distance from `activeIndex`; a CSS transition on `flex-grow` animates the width morph. A `setInterval` advances `activeIndex` (wrapping); clicking a panel sets it and pauses/resumes the timer. The existing, already-tested `buildDreamSlides` helper guarantees a minimum number of panels. No Embla.

**Tech Stack:** React client component, `motion/react` (caption fade-in), Tailwind, Next.js `Image`, existing `lib/agent-ui/dream-slides.ts`. No new dependencies; Embla is no longer imported by this file.

---

## File Structure

- **Modify (full rewrite):** `components/panels/dream/panel-dream.tsx` — the expanding-panels carousel. This is the only file changed by this plan.
- **Unchanged:** `lib/agent-ui/dream-slides.ts` + `.test.ts` (reused as-is), `components/agent-ui/views/dream-stage-view.tsx` (still renders `<PanelDream images={view.images} />`).

`PanelDream` is the only consumer-facing export; `dream-stage-view.tsx` imports `{ PanelDream }`. Keep that named export.

---

## Task 1: Rewrite PanelDream as expanding panels

**Files:**
- Modify (full rewrite): `components/panels/dream/panel-dream.tsx`

> No component unit test (per `conventions/testing.md`, React components are verified
> visually). Verification = `pnpm lint` clean + `pnpm test` (full suite) green.

- [ ] **Step 1: Replace the entire contents of `components/panels/dream/panel-dream.tsx` with:**

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';

const MIN_PANELS = 5;
const AUTOSCROLL_MS = 3500;
const RESUME_AFTER_MS = 5000;

// flex-grow weight by distance from the focused panel: focus is dominant,
// neighbours shrink to narrow vertical strips. Distances beyond the array
// fall back to GROW_FAR.
const GROW_BY_DISTANCE = [8, 1.6, 0.9];
const GROW_FAR = 0.5;

function growWeight(distance: number): number {
  return GROW_BY_DISTANCE[distance] ?? GROW_FAR;
}

interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  const panels = useMemo(() => buildDreamSlides(images, MIN_PANELS), [images]);

  // Start focused on the middle panel so the row mounts centered with
  // neighbours peeking on both sides (no left gap).
  const [activeIndex, setActiveIndex] = useState(() => Math.floor(panels.length / 2));

  // Re-center when the image set changes.
  useEffect(() => {
    setActiveIndex(Math.floor(panels.length / 2));
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

  const handlePanelClick = useCallback(
    (index: number) => {
      setActiveIndex(index);
      pauseThenResume();
    },
    [pauseThenResume],
  );

  if (panels.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  return (
    <div className="bg-beige-200 flex h-full w-full items-center justify-center gap-3 overflow-hidden p-6">
      {panels.map((panel, index) => {
        const distance = Math.abs(index - activeIndex);
        const isFocused = index === activeIndex;

        return (
          <button
            key={`${panel.originalIndex}-${index}`}
            type="button"
            onClick={() => handlePanelClick(index)}
            aria-label={panel.caption}
            style={{ flexGrow: growWeight(distance) }}
            className="relative h-[70%] min-w-[40px] basis-0 overflow-hidden rounded-3xl transition-[flex-grow] duration-700 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-beige-600 focus-visible:ring-offset-2"
          >
            <Image
              src={panel.url}
              alt={panel.caption}
              fill
              sizes="(max-width: 768px) 80vw, 45vw"
              className="object-cover"
            />

            <AnimatePresence>
              {isFocused && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs text-white backdrop-blur-md"
                >
                  {panel.caption}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Confirm there is no leftover Embla import and the motion import matches the repo**

Run: `grep -n "embla\|motion/react\|framer-motion" components/panels/dream/panel-dream.tsx`
Expected: no `embla` line; a single `motion/react` import. The repo convention is
`motion/react` (used by `components/agent-ui/chat.tsx`, `view-controller.tsx`,
`agent-chat-indicator.tsx`). If `pnpm lint`/tsc later reports `motion/react` cannot be
resolved, change the import to `import { AnimatePresence, motion } from 'framer-motion';`
(both packages are installed).

- [ ] **Step 3: Confirm the Tailwind tokens exist**

Run: `grep -n "beige-200\|beige-600\|beige-900" styles/globals.css`
Expected: all three are defined (they are used by the old/new component already). If
`beige-600` is missing, use the nearest existing beige token for the focus ring.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm lint`
Expected: PASS, no errors in `panel-dream.tsx`. (Also `npx tsc --noEmit` clean if you want
to double-check types.)

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS — existing suite stays green (68 tests including `dream-slides`). No new
component test is added.

- [ ] **Step 6: Commit**

```bash
git add components/panels/dream/panel-dream.tsx
git commit -m "feat(dream): rebuild carousel as expanding panels"
```

---

## Task 2: Manual visual verification & tuning (user)

**Files:** `components/panels/dream/panel-dream.tsx` (tuning only, if needed).

> Per project memory, browser/visual verification is left to the user unless explicitly
> requested. This task documents what to check and which constants to tune; it is not
> automated.

- [ ] **Step 1: Run the dev server and open the dream stage**

Run: `pnpm dev`, open the app, and trigger the `dream_stage` view from the dev panel for
both mocks: `Vienna detail (4 images)` and `Vienna detail (2 images)`.

- [ ] **Step 2: Confirm the behaviours match the reference**

Check:
- The row is always centered and fills the width — no empty gap on the left at any time,
  including the first paint.
- The focused panel is clearly wide; side panels are narrow vertical strips (cropped via
  `object-cover`), getting smaller with distance.
- Focus advances automatically every ~3.5s and loops (wraps from last back to first).
- Clicking a side panel makes it the focus (it expands), and autoscroll pauses then
  resumes after ~5s.
- The caption pill shows only on the focused panel and fades in.
- The width change animates smoothly (morph), not an instant jump.
- The 2-image mock still produces a full strip (cloned panels), no gaps.

- [ ] **Step 3 (optional): Tune constants in `panel-dream.tsx`**

If proportions/feel are off, adjust and re-check:
- `GROW_BY_DISTANCE` / `GROW_FAR` — relative panel widths (raise `GROW_BY_DISTANCE[0]` to
  make the focus more dominant; lower neighbours to make side strips thinner).
- `h-[70%]` on the panel — strip height.
- `duration-700` — morph speed.
- `AUTOSCROLL_MS` / `RESUME_AFTER_MS` — cadence and resume delay.
- `MIN_PANELS` — how many panels the strip fills to with few images.

---

## Self-Review Notes

- **Spec coverage:** expanding-panels layout filling width / always centered (Task 1
  flex row + `justify-center`); side panels as narrow strips via `flex-grow` + `object-cover`
  (Task 1 `growWeight`); no left gap because there is no scroll offset and the focus starts
  mid-row (Task 1 `activeIndex` init); autoscroll wrap + click-to-focus + pause/resume
  (Task 1 interval/handlers); caption focus-only with fade (Task 1 `AnimatePresence`);
  focus-ring accessibility (Task 1 className); reuse of `buildDreamSlides` with `MIN_PANELS`
  (Task 1); Embla removed (Task 1 + Step 2 check); responsive via shared grow weights
  (Task 1 + Task 2 tuning); no component unit test, helper test untouched (Task 1 note).
  All spec sections covered.
- **Placeholder scan:** none — full component code provided; tuning values are explicit
  constants, not placeholders.
- **Type consistency:** `buildDreamSlides(images, minCount)` and `DreamSlide.originalIndex`
  match the helper from the prior plan; `growWeight(distance)` defined and used in Task 1.
- **Risk:** `transition-[flex-grow]` animates `flex-grow` (animatable); if a browser feels
  janky, Task 2 tuning can switch to `transition-all`. The `motion/react` specifier has a
  documented fallback (Step 2).
