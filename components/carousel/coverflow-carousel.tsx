'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { type AnimationPlaybackControls, animate } from 'motion/react';
import { buildCarouselSlides } from './carousel-slides';

// 13 nodes: 5 visible (offset = -2..2) + 2 off-screen buffer each side, plus enough lead
// to keep that buffer full through a 2-step slide (clicking the 2nd image out, |offset| = 2).
const WINDOW_HALF = 6;
const WINDOW = WINDOW_HALF * 2 + 1;
const VISIBLE_HALF = 2; // strips shown each side of the focus; outer nodes are off-screen buffer
const MIN_PANELS = WINDOW; // ensure the window never shows duplicate panels
const DWELL_MS = 2500; // focus rest time before sliding to the next image
const SLIDE_MS = 1500; // slide duration
const GAP = 8; // px between slots
// width as a fraction of the container, by integer distance from the centre line.
// index 0 = focus; distances 1 and 2 are the two visible strips per side; distances >= 3
// are off-screen buffer (clipped). Fractional distances interpolate linearly.
const WIDTH_FRAC = [0.6, 0.15, 0.09, 0.07, 0.05];
// a caption is fully visible at the focus and fades to 0 by this distance from centre.
const CAPTION_FADE_DISTANCE = 0.5;

// Tailwind for each slot button. Extracted so the design dials (slot height, corner
// radius) sit next to the other constants above instead of buried in the JSX.
const SLOT_CLASS =
  'focus-visible:ring-beige-600 absolute top-1/2 h-[80%] overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function widthFracFor(distance: number): number {
  const lowerIndex = Math.floor(distance);
  if (lowerIndex >= WIDTH_FRAC.length - 1) return WIDTH_FRAC[WIDTH_FRAC.length - 1];
  const weight = distance - lowerIndex;
  return WIDTH_FRAC[lowerIndex] + (WIDTH_FRAC[lowerIndex + 1] - WIDTH_FRAC[lowerIndex]) * weight;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export interface CarouselImage {
  url: string;
  caption?: string;
}

interface CoverflowCarouselProps {
  images: CarouselImage[];
}

export function CoverflowCarousel({ images }: CoverflowCarouselProps) {
  const panels = useMemo(() => buildCarouselSlides(images, MIN_PANELS), [images]);

  // Panel index currently centred. React state because it drives the slot <img> srcs
  // (changes once per step). The smooth motion is driven by centreRef, not by re-rendering.
  const [centredIndex, setCentredIndex] = useState(0);

  const centredIndexRef = useRef(0); // mirrors `centredIndex` synchronously for callbacks/animation
  const centreRef = useRef(0); // fractional centre; at rest centreRef.current === centredIndexRef.current
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const captionRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest slideTo, reachable from the dwell timer without making scheduleNext depend
  // on slideTo (slideTo depends on scheduleNext, so a direct reference would form a cycle).
  const slideToRef = useRef<(target: number) => void>(() => {});
  // Reused across frames to avoid allocating per animation tick. Both indexed by slot
  // index (= offset + WINDOW_HALF): widths are computed once and read back, left edges accumulate.
  const slotWidthsRef = useRef<Float64Array>(new Float64Array(WINDOW));
  const leftEdgesRef = useRef<Float64Array>(new Float64Array(WINDOW));

  // Reset to the first image when the image set changes. Cancellation of any in-flight
  // slide/timer is handled by the autoscroll layout effect's cleanup, which re-runs on the
  // same `panels.length` change; clearing it here would race ahead of that effect re-arming
  // the timer (passive effects run after layout effects) and stop autoscroll from starting.
  useEffect(() => {
    centredIndexRef.current = 0;
    centreRef.current = 0;
    setCentredIndex(0);
  }, [panels.length]);

  // Position + size every slot from the current fractional centre. Writes to the DOM
  // directly (no React re-render) so it is cheap to call every animation frame.
  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // offset = signed slot offset from the centre. slot(offset) maps an offset to its
    // index into the reused widths/left arrays (slot offset=0 lives at WINDOW_HALF).
    const containerWidth = container.clientWidth;
    const centre = centreRef.current;
    const centredIndex = centredIndexRef.current;
    const slot = (offset: number) => offset + WINDOW_HALF;

    // width of each slot in px, keyed by offset from centre. Computed once per frame
    // into a reused array; widthOf is then a lookup (it's read several times below).
    const slotWidths = slotWidthsRef.current;
    for (let slotIndex = 0; slotIndex < WINDOW; slotIndex++) {
      const offset = slotIndex - WINDOW_HALF;
      slotWidths[slotIndex] =
        widthFracFor(Math.abs(centredIndex + offset - centre)) * containerWidth;
    }
    const widthOf = (offset: number) => slotWidths[slot(offset)];

    // cumulative left edges, anchoring the centre slot's left edge at 0.
    // Walk right: each edge = previous edge + previous width + gap.
    // Walk left:  each edge = next edge − gap − own width.
    const leftEdges = leftEdgesRef.current;
    leftEdges[slot(0)] = 0;
    for (let offset = 1; offset <= WINDOW_HALF; offset++)
      leftEdges[slot(offset)] = leftEdges[slot(offset - 1)] + widthOf(offset - 1) + GAP;
    for (let offset = -1; offset >= -WINDOW_HALF; offset--)
      leftEdges[slot(offset)] = leftEdges[slot(offset + 1)] - GAP - widthOf(offset);

    // align the fractional centre point with the container centre. centreOffset can span
    // multiple steps (clicking a non-adjacent slot), so interpolate between the two
    // integer slots straddling it instead of extrapolating the slot0->slot1 vector —
    // slot spacing varies with width, so that vector mis-centres once |offset| > 1.
    const centreOffset = centre - centredIndex;
    const lowerOffset = Math.floor(centreOffset);
    const centreOf = (offset: number) => leftEdges[slot(offset)] + widthOf(offset) / 2;
    const centrePoint =
      centreOf(lowerOffset) +
      (centreOf(lowerOffset + 1) - centreOf(lowerOffset)) * (centreOffset - lowerOffset);
    const centeringShift = containerWidth / 2 - centrePoint;

    for (let slotIndex = 0; slotIndex < WINDOW; slotIndex++) {
      const offset = slotIndex - WINDOW_HALF;
      const slotNode = slotRefs.current[slotIndex];
      if (slotNode) {
        slotNode.style.width = `${widthOf(offset)}px`;
        // translate3d (compositable) instead of `left` to avoid per-frame reflow.
        // The Y component replaces the Tailwind -translate-y-1/2 centring.
        slotNode.style.transform = `translate3d(${leftEdges[slot(offset)] + centeringShift}px, -50%, 0)`;
      }
      const caption = captionRefs.current[slotIndex];
      if (caption)
        caption.style.opacity = `${clamp01(1 - Math.abs(centredIndex + offset - centre) / CAPTION_FADE_DISTANCE)}`;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (panels.length <= 1) return;
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => slideToRef.current(centredIndexRef.current + 1), DWELL_MS);
  }, [panels.length]);

  const slideTo = useCallback(
    (target: number) => {
      if (target === centredIndexRef.current) {
        scheduleNext();
        return;
      }
      controlsRef.current?.stop();
      if (dwellRef.current) clearTimeout(dwellRef.current);
      controlsRef.current = animate(centreRef.current, target, {
        duration: SLIDE_MS / 1000,
        ease: 'easeInOut',
        onUpdate: (value) => {
          centreRef.current = value;
          layout();
        },
        onComplete: () => {
          const normalised = mod(target, panels.length);
          centredIndexRef.current = normalised;
          centreRef.current = normalised;
          setCentredIndex(normalised);
          scheduleNext();
        },
      });
    },
    [layout, scheduleNext, panels.length]
  );
  slideToRef.current = slideTo;

  const handleSlotClick = useCallback(
    (offset: number) => {
      if (offset === 0) return;
      slideTo(centredIndexRef.current + offset);
    },
    [slideTo]
  );

  // Initial paint, autoplay start, resize handling, and cleanup.
  useLayoutEffect(() => {
    layout();
    const container = containerRef.current;
    const resizeObserver = new ResizeObserver(() => layout());
    if (container) resizeObserver.observe(container);
    scheduleNext();
    return () => {
      resizeObserver.disconnect();
      controlsRef.current?.stop();
      if (dwellRef.current) clearTimeout(dwellRef.current);
    };
  }, [layout, scheduleNext]);

  // Re-paint geometry after a step's src swap so the new srcs land at rest geometry.
  useLayoutEffect(() => {
    layout();
  }, [centredIndex, layout]);

  if (panels.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  return (
    <div ref={containerRef} className="bg-beige-200 relative h-full w-full overflow-hidden">
      {Array.from({ length: WINDOW }, (_, slotIndex) => {
        const offset = slotIndex - WINDOW_HALF;
        const panel = panels[mod(centredIndex + offset, panels.length)];
        return (
          <button
            key={slotIndex}
            ref={(el) => {
              slotRefs.current[slotIndex] = el;
            }}
            type="button"
            tabIndex={Math.abs(offset) > VISIBLE_HALF ? -1 : 0}
            onClick={() => handleSlotClick(offset)}
            aria-label={panel.caption ?? ''}
            className={SLOT_CLASS}
            style={{ left: 0, width: 0, transform: 'translate3d(0, -50%, 0)' }}
          >
            <Image
              src={panel.url}
              alt={panel.caption ?? ''}
              fill
              sizes="(max-width: 768px) 60vw, 45vw"
              className="object-cover"
            />
            <span
              ref={(el) => {
                captionRefs.current[slotIndex] = el;
              }}
              className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs whitespace-nowrap text-white backdrop-blur-md"
              style={{ opacity: 0 }}
            >
              {panel.caption ?? ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
