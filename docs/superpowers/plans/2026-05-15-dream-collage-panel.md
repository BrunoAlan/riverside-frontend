# Dream Collage Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder Panel A in the switchable content panels with a "Dream" panel showing five images arranged as a scattered collage, each clipped by a soft-edged organic mask.

**Architecture:** A purely presentational React component (`PanelDream`) renders five images from `public/dream/`. Each image is clipped by a per-image organic SVG blob mask (feathered via `feGaussianBlur`) applied with CSS `mask-image`. Desktop shows the images absolutely positioned as a collage; mobile stacks them in a scrollable column. Per-image positions are passed as CSS custom properties so a single static class set can be `md:`-gated.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS v4, `next/image`.

---

## File Structure

- `public/dream/masks/blob-1.svg` … `blob-5.svg` — five feathered organic blob mask assets (new).
- `components/app/content-panels/panel-dream.tsx` — the new `PanelDream` component (new; replaces `panel-a.tsx`).
- `components/app/content-panels/panel-a.tsx` — deleted.
- `components/app/content-panels/registry.ts` — Panel A entry replaced with the Dream entry (modified).

There is no test suite in this project and this is a visual component, so verification is done via `pnpm lint` and `pnpm build` (Next's build runs TypeScript type-checking). Visual verification is left to the user.

---

## Task 1: Create the organic blob mask assets

**Files:**
- Create: `public/dream/masks/blob-1.svg`
- Create: `public/dream/masks/blob-2.svg`
- Create: `public/dream/masks/blob-3.svg`
- Create: `public/dream/masks/blob-4.svg`
- Create: `public/dream/masks/blob-5.svg`

Each SVG is a single black organic blob path blurred with `feGaussianBlur`, giving a feathered alpha edge. The filter region is expanded so the blur is not clipped. Used as CSS `mask-image` with `mask-size: 100% 100%`, so the `viewBox` aspect is irrelevant — it stretches to the image box.

- [ ] **Step 1: Create `public/dream/masks/blob-1.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="9" />
  </filter>
  <path filter="url(#f)" fill="#000000" d="M40,34 Q92,8 152,28 Q196,46 180,94 Q168,142 104,138 Q42,140 22,94 Q8,52 40,34 Z" />
</svg>
```

- [ ] **Step 2: Create `public/dream/masks/blob-2.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="9" />
  </filter>
  <path filter="url(#f)" fill="#000000" d="M30,66 Q30,22 90,22 Q158,16 178,62 Q194,114 142,136 Q80,150 42,124 Q18,104 30,66 Z" />
</svg>
```

- [ ] **Step 3: Create `public/dream/masks/blob-3.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="9" />
  </filter>
  <path filter="url(#f)" fill="#000000" d="M52,26 Q122,12 168,40 Q198,70 172,112 Q150,150 88,138 Q32,134 24,84 Q20,44 52,26 Z" />
</svg>
```

- [ ] **Step 4: Create `public/dream/masks/blob-4.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="9" />
  </filter>
  <path filter="url(#f)" fill="#000000" d="M44,40 Q100,14 158,34 Q196,52 184,100 Q172,146 106,142 Q44,144 26,98 Q12,58 44,40 Z" />
</svg>
```

- [ ] **Step 5: Create `public/dream/masks/blob-5.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
  <filter id="f" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="9" />
  </filter>
  <path filter="url(#f)" fill="#000000" d="M34,58 Q40,18 100,22 Q166,20 180,70 Q190,120 134,138 Q72,148 42,116 Q24,96 34,58 Z" />
</svg>
```

- [ ] **Step 6: Commit**

```bash
git add public/dream/masks/
git commit -m "feat(content): add organic blob mask assets for dream panel"
```

---

## Task 2: Create the PanelDream component

**Files:**
- Create: `components/app/content-panels/panel-dream.tsx`

The component is a server component (no hooks, no interactivity — matches the existing placeholder panels which have no `'use client'` directive).

Per-image desktop position is supplied as CSS custom properties (`--dt`, `--dl`, `--dw`, `--dh`) via inline `style`. The wrapper uses mobile-first classes (stacked, static) and `md:`-prefixed arbitrary-value classes that read those custom properties — this keeps the class list static while the values stay dynamic.

The blob mask is applied to an inner `absolute inset-0` layer that wraps the `next/image`, so the tag pill (a sibling) is NOT masked and stays crisp.

- [ ] **Step 1: Create `components/app/content-panels/panel-dream.tsx`**

```tsx
import Image from 'next/image';
import type { CSSProperties } from 'react';

interface DreamImage {
  src: string;
  mask: string;
  tag: string;
  /** Desktop collage position, as CSS length strings (percentages). */
  top: string;
  left: string;
  width: string;
  height: string;
}

const DREAM_IMAGES: DreamImage[] = [
  {
    src: '/dream/1.png',
    mask: '/dream/masks/blob-1.svg',
    tag: '1 – Image Tag',
    top: '9%',
    left: '6%',
    width: '28%',
    height: '25%',
  },
  {
    src: '/dream/2.jpg',
    mask: '/dream/masks/blob-2.svg',
    tag: '1 – Image Tag',
    top: '14%',
    left: '37%',
    width: '36%',
    height: '32%',
  },
  {
    src: '/dream/3.png',
    mask: '/dream/masks/blob-3.svg',
    tag: '1 – Image Tag',
    top: '12%',
    left: '72%',
    width: '25%',
    height: '25%',
  },
  {
    src: '/dream/4.png',
    mask: '/dream/masks/blob-4.svg',
    tag: '1 – Image Tag',
    top: '50%',
    left: '13%',
    width: '28%',
    height: '28%',
  },
  {
    src: '/dream/5.jpg',
    mask: '/dream/masks/blob-5.svg',
    tag: '1 – Image Tag',
    top: '52%',
    left: '66%',
    width: '30%',
    height: '27%',
  },
];

export function PanelDream() {
  return (
    <div className="bg-beige-200 relative flex h-full w-full flex-col gap-8 overflow-y-auto py-10 md:block md:gap-0 md:overflow-hidden md:py-0">
      {DREAM_IMAGES.map((image, index) => {
        const positionVars = {
          '--dt': image.top,
          '--dl': image.left,
          '--dw': image.width,
          '--dh': image.height,
        } as CSSProperties;

        const maskStyle: CSSProperties = {
          maskImage: `url(${image.mask})`,
          WebkitMaskImage: `url(${image.mask})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        };

        return (
          <div
            key={image.src}
            style={positionVars}
            className="relative mx-auto h-64 w-[85%] shrink-0 md:absolute md:mx-0 md:h-[var(--dh)] md:w-[var(--dw)] md:top-[var(--dt)] md:left-[var(--dl)]"
          >
            <div className="absolute inset-0" style={maskStyle}>
              <Image
                src={image.src}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 85vw, 35vw"
                className="object-cover"
              />
            </div>
            <span className="absolute bottom-[18%] left-[14%] rounded-full bg-[#28241e]/85 px-3 py-1 text-xs text-white">
              {image.tag}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: PASS with no errors for `panel-dream.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/panel-dream.tsx
git commit -m "feat(content): add dream collage panel component"
```

---

## Task 3: Register the Dream panel and remove Panel A

**Files:**
- Modify: `components/app/content-panels/registry.ts`
- Delete: `components/app/content-panels/panel-a.tsx`

- [ ] **Step 1: Replace the full contents of `components/app/content-panels/registry.ts`**

```ts
import type { ComponentType } from 'react';
import { PanelDream } from '@/components/app/content-panels/panel-dream';
import { PanelB } from '@/components/app/content-panels/panel-b';
import { PanelC } from '@/components/app/content-panels/panel-c';
import { PanelWindow } from '@/components/app/content-panels/panel-window';

export interface ContentPanel {
  id: string;
  label: string;
  component: ComponentType;
}

export const CONTENT_PANELS: ContentPanel[] = [
  { id: 'window', label: 'Ventana', component: PanelWindow },
  { id: 'dream', label: 'Dream', component: PanelDream },
  { id: 'panel-b', label: 'Contenido B', component: PanelB },
  { id: 'panel-c', label: 'Contenido C', component: PanelC },
];
```

- [ ] **Step 2: Delete the old placeholder panel**

```bash
git rm components/app/content-panels/panel-a.tsx
```

- [ ] **Step 3: Verify nothing else imports `panel-a`**

Run: `grep -rn "panel-a" components/ app/ 2>/dev/null`
Expected: no output (no remaining references).

- [ ] **Step 4: Verify lint passes**

Run: `pnpm lint`
Expected: PASS with no errors.

- [ ] **Step 5: Commit**

```bash
git add components/app/content-panels/registry.ts
git commit -m "feat(content): replace placeholder Panel A with Dream panel"
```

---

## Task 4: Verify the production build

**Files:** none (verification only).

- [ ] **Step 1: Run the production build**

Run: `pnpm build`
Expected: build completes successfully with no TypeScript or ESLint errors.

- [ ] **Step 2: If the build fails**

Read the error, fix the offending file, re-run `pnpm build`, then amend or add a follow-up commit as appropriate. Do not proceed until the build is green.

---

## Self-Review Notes

- **Spec coverage:** rename Panel A → `panel-dream.tsx` (Tasks 2 & 3); registry entry `{ id: 'dream', label: 'Dream', component: PanelDream }` (Task 3); five blob mask assets (Task 1); `next/image` + `fill` + `object-cover` + `mask-image` (Task 2); placeholder tag pills (Task 2); adaptive collage desktop / stacked mobile (Task 2); `DREAM_IMAGES` config array (Task 2); cream background via `bg-beige-200` (Task 2); no automated tests (Task 4 build check). All covered.
- **Background token:** `bg-beige-200` (`#f3ede7`) is used rather than `beige-50` because it visually matches the warm cream of the mock; both tokens exist in `styles/globals.css`.
- **Type consistency:** `DreamImage` fields (`src`, `mask`, `tag`, `top`, `left`, `width`, `height`) are used consistently; `PanelDream` is the export name imported by `registry.ts`.
- **Selector collision:** the top-row images start at `top` ≥ 9% and image 3 at `12%`, below the panel selector's vertical extent, so they do not overlap it.
