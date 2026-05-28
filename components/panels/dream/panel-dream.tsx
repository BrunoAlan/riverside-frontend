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
    [pauseThenResume]
  );

  const safeIndex = Math.min(activeIndex, panels.length - 1);

  if (panels.length === 0) {
    return <div className="bg-beige-200 h-full w-full" />;
  }

  return (
    <div className="bg-beige-200 flex h-full w-full items-center justify-center gap-3 overflow-hidden p-6">
      {panels.map((panel, index) => {
        const distance = Math.abs(index - safeIndex);
        const isFocused = index === safeIndex;

        return (
          <button
            key={`${panel.originalIndex}-${index}`}
            type="button"
            onClick={() => handlePanelClick(index)}
            aria-label={panel.caption}
            style={{ flexGrow: growWeight(distance) }}
            className="focus-visible:ring-beige-600 relative h-[70%] min-w-[40px] basis-0 overflow-hidden rounded-3xl transition-[flex-grow] duration-700 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
