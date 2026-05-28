# Extract CoverflowCarousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the coverflow carousel mechanic out of `panel-dream.tsx` into a reusable `components/carousel/CoverflowCarousel`, leaving Dream Stage visually and behaviorally identical.

**Architecture:** Pure extraction. A self-contained `CoverflowCarousel` image component owns all imperative layout/animation logic plus internal slide padding and the caption fade. `PanelDream` becomes a one-line wrapper. The slide-padding helper moves out of `lib/agent-ui` so the reusable component doesn't depend on agent-ui.

**Tech Stack:** Next.js (App Router, client component), React hooks, `motion/react` `animate()`, Tailwind, Vitest, pnpm.

---

## File structure

- **Create** `components/carousel/coverflow-carousel.tsx` — `CoverflowCarousel` + `CarouselImage` type; all carousel logic; pads images internally.
- **Create** `components/carousel/carousel-slides.ts` — `buildCarouselSlides` (moved from `lib/agent-ui/dream-slides.ts`).
- **Create** `components/carousel/carousel-slides.test.ts` — moved test, renamed import.
- **Modify** `components/panels/dream/panel-dream.tsx` — slim to a wrapper over `CoverflowCarousel`.
- **Delete** `lib/agent-ui/dream-slides.ts` and `lib/agent-ui/dream-slides.test.ts`.

No other file imports `buildDreamSlides` or `PanelDream` internals (only `panel-dream.tsx` imported the helper; `dream-stage-view.tsx` imports `PanelDream`, whose public shape is unchanged).

---

### Task 1: Move the slide-padding helper into the carousel folder

**Files:**
- Create: `components/carousel/carousel-slides.ts`
- Create: `components/carousel/carousel-slides.test.ts`
- Delete (later, Task 4): `lib/agent-ui/dream-slides.ts`, `lib/agent-ui/dream-slides.test.ts`

- [ ] **Step 1: Create `components/carousel/carousel-slides.ts`**

```ts
import type { DestinationImage } from '@/lib/agent-ui/commands';

/**
 * Repeats whole cycles of `images` until there are at least `minCount` slides,
 * so the center-focus carousel always has side slides to peek and can loop
 * without gaps. Returns [] for an empty list.
 */
export function buildCarouselSlides(
  images: DestinationImage[],
  minCount: number
): DestinationImage[] {
  if (images.length === 0) return [];

  const cycles = Math.max(1, Math.ceil(minCount / images.length));
  const slides: DestinationImage[] = [];

  for (let c = 0; c < cycles; c++) {
    slides.push(...images);
  }

  return slides;
}
```

- [ ] **Step 2: Create `components/carousel/carousel-slides.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildCarouselSlides } from './carousel-slides';

const img = (n: number) => ({ url: `/dream/${n}.jpg`, caption: `cap ${n}` });

describe('buildCarouselSlides', () => {
  it('leaves the list untouched when there are already enough images', () => {
    const images = [img(1), img(2), img(3), img(4), img(5)];
    const slides = buildCarouselSlides(images, 5);
    expect(slides).toHaveLength(5);
    expect(slides.map((s) => s.url)).toEqual(images.map((i) => i.url));
  });

  it('clones in order to reach the minimum count', () => {
    const slides = buildCarouselSlides([img(1), img(2)], 5);
    expect(slides).toHaveLength(6); // 2 -> 3 whole cycles to reach >= 5
    expect(slides.map((s) => s.caption)).toEqual([
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
    ]);
  });

  it('handles a single image', () => {
    const slides = buildCarouselSlides([img(1)], 5);
    expect(slides).toHaveLength(5);
    expect(new Set(slides.map((s) => s.url))).toEqual(new Set(['/dream/1.jpg']));
  });

  it('returns an empty array for no images', () => {
    expect(buildCarouselSlides([], 5)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the new test to verify it passes**

Run: `pnpm test -- carousel-slides`
Expected: PASS (4 tests). The old `dream-slides.test.ts` still passes too — both exist until Task 4.

---

### Task 2: Create the CoverflowCarousel component

**Files:**
- Create: `components/carousel/coverflow-carousel.tsx`

This is `panel-dream.tsx` moved verbatim with four precise edits. Start by copying the
entire current contents of `components/panels/dream/panel-dream.tsx` into the new file,
then apply Steps 2–5.

- [ ] **Step 1: Copy `panel-dream.tsx` contents into `components/carousel/coverflow-carousel.tsx`**

Copy the file as-is. The edits below transform it.

- [ ] **Step 2: Swap the imports (replace the two app-specific import lines)**

Replace:
```tsx
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';
```
with:
```tsx
import { buildCarouselSlides } from './carousel-slides';
```

- [ ] **Step 3: Replace the props interface and `DestinationImage` type with `CarouselImage`**

Replace:
```tsx
interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  const panels = useMemo(() => buildDreamSlides(images, MIN_PANELS), [images]);
```
with:
```tsx
export interface CarouselImage {
  url: string;
  caption?: string;
}

interface CoverflowCarouselProps {
  images: CarouselImage[];
}

export function CoverflowCarousel({ images }: CoverflowCarouselProps) {
  const panels = useMemo(() => buildCarouselSlides(images, MIN_PANELS), [images]);
```

- [ ] **Step 4: Make caption usages tolerate an optional caption**

`buildCarouselSlides` is typed against `DestinationImage` (required `caption`), but
`CoverflowCarousel`'s public `images` prop uses optional `caption`. The JSX reads
`panel.caption` for `aria-label`, `alt`, and the pill text. Replace the three
`panel.caption` reads with `panel.caption ?? ''`:

In the slot button, replace `aria-label={panel.caption}` with:
```tsx
            aria-label={panel.caption ?? ''}
```
In the `<Image>`, replace `alt={panel.caption}` with:
```tsx
              alt={panel.caption ?? ''}
```
In the caption `<span>`, replace `{panel.caption}` with:
```tsx
              {panel.caption ?? ''}
```

> Note: `buildCarouselSlides` expects `DestinationImage[]`. `CarouselImage` (optional
> caption) is NOT assignable to `DestinationImage` (required caption). Fix by widening
> the helper's signature to `CarouselImage` instead — see Step 5.

- [ ] **Step 5: Decouple the helper from `DestinationImage`**

Edit `components/carousel/carousel-slides.ts` so it no longer imports from
`lib/agent-ui` and operates on the carousel's own type. Replace its entire contents with:

```ts
import type { CarouselImage } from './coverflow-carousel';

/**
 * Repeats whole cycles of `images` until there are at least `minCount` slides,
 * so the center-focus carousel always has side slides to peek and can loop
 * without gaps. Returns [] for an empty list.
 */
export function buildCarouselSlides(
  images: CarouselImage[],
  minCount: number
): CarouselImage[] {
  if (images.length === 0) return [];

  const cycles = Math.max(1, Math.ceil(minCount / images.length));
  const slides: CarouselImage[] = [];

  for (let c = 0; c < cycles; c++) {
    slides.push(...images);
  }

  return slides;
}
```

And update `components/carousel/carousel-slides.test.ts` — the `img` helper already
returns `{ url, caption }`, which satisfies `CarouselImage`, so no test-body change is
needed. The import line stays `import { buildCarouselSlides } from './carousel-slides';`.

- [ ] **Step 6: Run typecheck/lint on the new files**

Run: `pnpm lint`
Expected: clean (no unused-import or type errors in the new files). `panel-dream.tsx`
still compiles at this point — it is slimmed in Task 3.

---

### Task 3: Slim PanelDream to a wrapper

**Files:**
- Modify: `components/panels/dream/panel-dream.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { CoverflowCarousel } from '@/components/carousel/coverflow-carousel';

interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  return <CoverflowCarousel images={images} />;
}
```

`DestinationImage` (`{ url: string; caption: string }`) is assignable to
`CarouselImage` (`{ url: string; caption?: string }`), so `images` passes through.
The `'use client'` directive is intentionally dropped here — this wrapper renders no
client-only hooks; `CoverflowCarousel` keeps its own `'use client'`.

- [ ] **Step 2: Verify the only consumer still type-checks**

Run: `pnpm lint`
Expected: clean. `components/agent-ui/views/dream-stage-view.tsx` imports `PanelDream`
with the same `images` prop — unchanged.

---

### Task 4: Remove the old helper and verify the whole move

**Files:**
- Delete: `lib/agent-ui/dream-slides.ts`
- Delete: `lib/agent-ui/dream-slides.test.ts`

- [ ] **Step 1: Confirm nothing else imports the old helper**

Run: `grep -rn "dream-slides\|buildDreamSlides" --include="*.ts" --include="*.tsx" .`
Expected: no matches outside the two files about to be deleted.

- [ ] **Step 2: Delete the old files**

```bash
git rm lib/agent-ui/dream-slides.ts lib/agent-ui/dream-slides.test.ts
```

- [ ] **Step 3: Run the full suite and lint**

Run: `pnpm test`
Expected: green; the carousel-slides test runs, total test count unchanged vs. before
(one test file renamed, same 4 cases).

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/carousel/coverflow-carousel.tsx \
        components/carousel/carousel-slides.ts \
        components/carousel/carousel-slides.test.ts \
        components/panels/dream/panel-dream.tsx
git commit -m "refactor(carousel): extract reusable CoverflowCarousel from PanelDream"
```

> Per the user's workflow, do NOT commit until the user has verified behavior and
> explicitly asks to commit. Treat Step 4 as the final action gated on their go-ahead.

---

## Notes

- No browser verification unless the user requests it; the move is verbatim so Dream
  Stage should look and behave identically.
- `beige` tokens and `bg-beige-200` stay inside `CoverflowCarousel` as-is.
