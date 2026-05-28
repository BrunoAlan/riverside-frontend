# Extract CoverflowCarousel — design

## Goal

Extract the coverflow carousel mechanic out of `components/panels/dream/panel-dream.tsx`
into a standalone, reusable component. This is a **preventive extraction**: there is no
second consumer yet, so the API stays conservative and the change is a pure move — no
visual or behavioral difference in Dream Stage.

## Approach

A self-contained `CoverflowCarousel` image component (chosen over a generic
`Carousel<T>` render-prop or a headless hook). It owns all the mechanics plus the
caption fade and slide padding, so consumers pass only images. `PanelDream` becomes a
thin wrapper.

## Components & files

1. **`components/carousel/coverflow-carousel.tsx`** (new)
   - Exports `CoverflowCarousel` and the type `CarouselImage = { url: string; caption?: string }`.
   - Holds all current imperative logic verbatim: constants (`WINDOW_HALF`, `WINDOW`,
     `VISIBLE_HALF`, `MIN_PANELS`, `DWELL_MS`, `SLIDE_MS`, `GAP`, `WIDTH_FRAC`), helpers
     (`mod`, `widthFracFor`, `clamp01`), refs, `layout`, `slideTo`, `scheduleNext`,
     `handleSlotClick`, the two `useLayoutEffect`s, the reset `useEffect`, and the slots JSX.
   - Slide padding becomes internal: the component pads its `images` prop to fill the
     window via `buildCarouselSlides`.

2. **`components/carousel/carousel-slides.ts`** (+ `carousel-slides.test.ts`)
   - Moved from `lib/agent-ui/dream-slides.ts`; `buildDreamSlides` → `buildCarouselSlides`.
   - Called by the carousel, not by Dream. Moving it keeps a reusable UI component from
     depending on `lib/agent-ui` (wrong dependency direction).
   - Test moves with it; assertions unchanged besides the renamed import.

3. **`components/panels/dream/panel-dream.tsx`** becomes a thin wrapper:
   ```tsx
   export function PanelDream({ images }: { images: DestinationImage[] }) {
     return <CoverflowCarousel images={images} />;
   }
   ```
   `DestinationImage` (`{ url, caption }`) is structurally assignable to `CarouselImage`,
   so it passes through directly.

4. **Delete** `lib/agent-ui/dream-slides.ts` and `lib/agent-ui/dream-slides.test.ts`
   (moved in #2). No other code imports `buildDreamSlides` (only `panel-dream.tsx` did).

## Decisions

- **Location:** new top-level `components/carousel/` folder. Not Dream-specific;
  `components/ui/` is off-limits (shadcn-only).
- **Styling:** keep the `beige` tokens and `bg-beige-200` exactly as-is inside the
  carousel. This is extraction, not restyling — recoloring would be separate scope.
- **Type:** `CarouselImage` lives in the carousel file; `DestinationImage` in
  `lib/agent-ui/commands.ts` is untouched.

## Verification

- `pnpm lint` clean.
- `pnpm test` green — the moved slides test still passes (count unchanged).
- Behavior identical to today (verbatim move). No browser check unless requested.

## Out of scope

- Any generic / non-image carousel API.
- Restyling or removing beige tokens.
- New tuning props or configurability (no second consumer to design against).
