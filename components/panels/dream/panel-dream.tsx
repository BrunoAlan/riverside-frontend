'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { type AnimationPlaybackControls, animate } from 'motion/react';
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
    [layout, scheduleNext]
  );

  const handleSlotClick = useCallback(
    (k: number) => {
      if (k === 0) return;
      slideTo(baseRef.current + k);
    },
    [slideTo]
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
    <div ref={containerRef} className="bg-beige-200 relative h-full w-full overflow-hidden">
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
              className="bg-beige-900/60 pointer-events-none absolute bottom-6 left-6 z-20 rounded-full px-4 py-2 text-xs whitespace-nowrap text-white backdrop-blur-md"
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
