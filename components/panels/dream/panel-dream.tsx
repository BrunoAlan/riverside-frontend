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
    [pauseThenResume]
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
            className="focus-visible:ring-beige-600 relative h-[70%] min-w-[40px] basis-0 overflow-hidden rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
