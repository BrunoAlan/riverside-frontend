# Dream Stage Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dream stage's animated SVG mask collage with a center-focus coverflow carousel that autoscrolls in an infinite loop and refocuses a slide on click.

**Architecture:** A pure helper in `lib/` clones the image list so the carousel always has enough slides. `PanelDream` is rewritten as an Embla-backed client component: `loop`+`center` alignment, per-slide scale/opacity/blur driven by scroll progress (subtle), step-by-step autoscroll via interval, and click/drag-to-focus that pauses then resumes autoscroll. Caption shows only on the focused slide with a framer-motion fade-in.

**Tech Stack:** React (client component), `embla-carousel-react` (installed), `framer-motion`/`motion` (installed), Tailwind, Next.js `Image`. No new dependencies.

---

## File Structure

- **Create:** `lib/agent-ui/dream-slides.ts` — pure helper `buildDreamSlides(images, minCount)` returning slides (clones to fill, preserves captions, tags original index).
- **Create:** `lib/agent-ui/dream-slides.test.ts` — unit test for the helper.
- **Rewrite:** `components/panels/dream/panel-dream.tsx` — Embla carousel replacing the mask collage.
- **Unchanged:** `components/agent-ui/views/dream-stage-view.tsx` (still passes `view.images`).

---

## Task 1: Pure slide-builder helper (clone-to-fill)

**Files:**
- Create: `lib/agent-ui/dream-slides.ts`
- Test: `lib/agent-ui/dream-slides.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildDreamSlides } from './dream-slides';

const img = (n: number) => ({ url: `/dream/${n}.jpg`, caption: `cap ${n}` });

describe('buildDreamSlides', () => {
  it('leaves the list untouched when there are already enough images', () => {
    const images = [img(1), img(2), img(3), img(4), img(5)];
    const slides = buildDreamSlides(images, 5);
    expect(slides).toHaveLength(5);
    expect(slides.map((s) => s.url)).toEqual(images.map((i) => i.url));
  });

  it('clones in order to reach the minimum count', () => {
    const slides = buildDreamSlides([img(1), img(2)], 5);
    expect(slides).toHaveLength(6); // 2 -> next multiple >= 5 keeps whole cycles
    expect(slides.map((s) => s.caption)).toEqual([
      'cap 1', 'cap 2', 'cap 1', 'cap 2', 'cap 1', 'cap 2',
    ]);
  });

  it('preserves the original index for each slide so the caption is stable', () => {
    const slides = buildDreamSlides([img(1), img(2)], 5);
    expect(slides.map((s) => s.originalIndex)).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('handles a single image', () => {
    const slides = buildDreamSlides([img(1)], 5);
    expect(slides).toHaveLength(5);
    expect(new Set(slides.map((s) => s.url))).toEqual(new Set(['/dream/1.jpg']));
  });

  it('returns an empty array for no images', () => {
    expect(buildDreamSlides([], 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test dream-slides`
Expected: FAIL — `buildDreamSlides` is not defined / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { DestinationImage } from './commands';

export interface DreamSlide extends DestinationImage {
  /** Index into the original images array (stable identity for the caption). */
  originalIndex: number;
}

/**
 * Repeats whole cycles of `images` until there are at least `minCount` slides,
 * so the center-focus carousel always has side slides to peek and can loop
 * without gaps. Returns [] for an empty list.
 */
export function buildDreamSlides(
  images: DestinationImage[],
  minCount: number,
): DreamSlide[] {
  if (images.length === 0) return [];

  const cycles = Math.max(1, Math.ceil(minCount / images.length));
  const slides: DreamSlide[] = [];

  for (let c = 0; c < cycles; c++) {
    images.forEach((image, originalIndex) => {
      slides.push({ ...image, originalIndex });
    });
  }

  return slides;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test dream-slides`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/dream-slides.ts lib/agent-ui/dream-slides.test.ts
git commit -m "feat(dream): add clone-to-fill slide builder for carousel"
```

---

## Task 2: Rewrite PanelDream as an Embla carousel

**Files:**
- Modify (full rewrite): `components/panels/dream/panel-dream.tsx`

> No component unit test (per `conventions/testing.md`, React components are verified
> visually). Verification is `pnpm lint` + `pnpm test` green, plus a visual check by the user.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `components/panels/dream/panel-dream.tsx` with:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { AnimatePresence, motion } from 'motion/react';
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';

const MIN_SLIDES = 5;
const AUTOSCROLL_MS = 3500;
const RESUME_AFTER_MS = 5000;

// Subtle coverflow: focused slide full size/clarity, neighbours slightly
// smaller, dimmer and barely blurred.
const SCALE_FOCUS = 1;
const SCALE_EDGE = 0.8;
const OPACITY_FOCUS = 1;
const OPACITY_EDGE = 0.6;
const BLUR_EDGE_PX = 2;

interface PanelDreamProps {
  images: DestinationImage[];
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function PanelDream({ images }: PanelDreamProps) {
  const slides = buildDreamSlides(images, MIN_SLIDES);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    duration: 32, // Embla "speed" units; higher = slower, more graceful snap.
    containScroll: false,
  });

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // --- Coverflow tween: drive scale/opacity/blur from scroll progress. ---
  const applyTween = useCallback((api: EmblaCarouselType) => {
    const scrollProgress = api.scrollProgress();
    const scrollSnaps = api.scrollSnapList();
    const slideNodes = api.slideNodes();
    const engine = api.internalEngine();

    api.scrollSnapList().forEach((snap, snapIndex) => {
      let diffToTarget = snap - scrollProgress;

      // Account for looped slides so the wrap-around stays smooth.
      engine.slideLooper.loopPoints.forEach((loopItem) => {
        const target = loopItem.target();
        if (snapIndex === loopItem.index && target !== 0) {
          const sign = Math.sign(target);
          if (sign === -1) diffToTarget = snap - (1 + scrollProgress);
          if (sign === 1) diffToTarget = snap + (1 - scrollProgress);
        }
      });

      const node = slideNodes[snapIndex];
      if (!node) return;

      // 0 at focus, growing toward 1 (and beyond) as the slide leaves center.
      const t = Math.min(Math.abs(diffToTarget), 1);
      const scale = lerp(SCALE_FOCUS, SCALE_EDGE, t);
      const opacity = lerp(OPACITY_FOCUS, OPACITY_EDGE, t);
      const blur = lerp(0, BLUR_EDGE_PX, t);

      node.style.transform = `scale(${scale})`;
      node.style.opacity = `${opacity}`;
      node.style.filter = `blur(${blur}px)`;
    });

    // Silence unused var lint while keeping the names self-documenting.
    void scrollSnaps;
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onScroll = () => applyTween(emblaApi);

    onSelect();
    applyTween(emblaApi);

    emblaApi.on('select', onSelect);
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('reInit', onScroll);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('scroll', onScroll);
      emblaApi.off('reInit', onSelect);
      emblaApi.off('reInit', onScroll);
    };
  }, [emblaApi, applyTween]);

  // --- Step-by-step autoscroll with pause/resume on interaction. ---
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAutoscroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoscroll = useCallback(() => {
    if (!emblaApi || intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOSCROLL_MS);
  }, [emblaApi]);

  const pauseThenResume = useCallback(() => {
    stopAutoscroll();
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(startAutoscroll, RESUME_AFTER_MS);
  }, [stopAutoscroll, startAutoscroll]);

  useEffect(() => {
    if (!emblaApi) return;
    startAutoscroll();

    // Manual drag counts as interaction -> pause then resume.
    emblaApi.on('pointerDown', pauseThenResume);

    return () => {
      emblaApi.off('pointerDown', pauseThenResume);
      stopAutoscroll();
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [emblaApi, startAutoscroll, stopAutoscroll, pauseThenResume]);

  const handleSlideClick = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      emblaApi.scrollTo(index);
      pauseThenResume();
    },
    [emblaApi, pauseThenResume],
  );

  if (slides.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  return (
    <div className="bg-beige-200 flex h-full w-full items-center justify-center overflow-hidden">
      <div className="w-full" ref={emblaRef}>
        <div className="flex items-center">
          {slides.map((slide, index) => {
            const isFocused = index === selectedIndex;
            return (
              <div
                key={`${slide.originalIndex}-${index}`}
                className="relative min-w-0 shrink-0 grow-0 basis-[70%] px-2 will-change-transform md:basis-[46%]"
              >
                <button
                  type="button"
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                  onClick={() => handleSlideClick(index)}
                  aria-label={slide.caption}
                  className="relative block aspect-[16/10] w-full overflow-hidden rounded-3xl focus:outline-none"
                >
                  <Image
                    src={slide.url}
                    alt={slide.caption}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 768px) 70vw, 46vw"
                    className="object-cover"
                  />
                </button>

                <AnimatePresence>
                  {isFocused && (
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs text-white backdrop-blur-md"
                    >
                      {slide.caption}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the import path for the Embla type**

Run: `ls node_modules/embla-carousel/index.d.ts && grep -rn "EmblaCarouselType" node_modules/embla-carousel-react/index.d.ts`
Expected: the type re-exports from `embla-carousel`. If `embla-carousel` is not directly resolvable, change the import to:
`import type { EmblaCarouselType } from 'embla-carousel-react';`
(both re-export the same type). Use whichever resolves.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm lint`
Expected: PASS, no errors in `panel-dream.tsx`. If the `motion/react` import path errors, fall back to `import { AnimatePresence, motion } from 'framer-motion';` (both packages are installed and export the same API).

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: PASS — existing suite stays green and `dream-slides` passes. (No new component test.)

- [ ] **Step 5: Commit**

```bash
git add components/panels/dream/panel-dream.tsx
git commit -m "feat(dream): replace mask collage with center-focus carousel"
```

---

## Task 3: Manual visual verification (user)

**Files:** none.

> Per project memory, browser/visual verification is left to the user unless explicitly
> requested. This task documents what to check; it is not automated.

- [ ] **Step 1: Run the dev server and open the dream stage**

Run: `pnpm dev` then open the app and trigger the `dream_stage` view via the dev panel
(mock `Vienna detail (4 images)` and `Vienna detail (2 images)`).

- [ ] **Step 2: Confirm the behaviors**

Check:
- Center image is large/clear; 2 side images peek per side on desktop (1 per side on a
  narrow window), subtly smaller, dimmer and faintly blurred.
- Autoscroll advances step-by-step in an infinite loop (~3.5s cadence).
- Clicking a side image recenters it; autoscroll pauses, then resumes after ~5s.
- Drag/swipe works and pauses/resumes the same way.
- The caption (pill) shows only on the focused slide and fades in.
- The 2-image mock has no gaps (clones fill the carousel).

- [ ] **Step 3 (optional): Tune constants**

If cadence/scale/blur feel off, adjust `AUTOSCROLL_MS`, `RESUME_AFTER_MS`, `SCALE_EDGE`,
`OPACITY_EDGE`, `BLUR_EDGE_PX`, or Embla `duration` in `panel-dream.tsx` and re-check.

---

## Self-Review Notes

- **Spec coverage:** full replacement (Task 2 removes mask/collage); clone-to-fill (Task 1);
  scroll-progress tween for scale/opacity/subtle blur (Task 2 `applyTween`); step autoscroll
  + click/drag pause-resume (Task 2); caption focus-only with fade (Task 2); responsive
  basis (Task 2); helper unit test, no component test (Task 1, per conventions). All covered.
- **Type consistency:** `buildDreamSlides(images, minCount)` and `DreamSlide.originalIndex`
  used identically in Task 1 and Task 2.
- **Risk:** exact import specifier for `EmblaCarouselType` and `motion` — Step 2/3 of Task 2
  give the fallback specifiers, both already installed.
