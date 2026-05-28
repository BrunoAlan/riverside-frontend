'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import { AnimatePresence, motion } from 'motion/react';
import type { DestinationImage } from '@/lib/agent-ui/commands';
import { buildDreamSlides } from '@/lib/agent-ui/dream-slides';

type EmblaCarouselType = NonNullable<UseEmblaCarouselType[1]>;

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
    duration: 32,
    containScroll: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const applyTween = useCallback((api: EmblaCarouselType) => {
    const scrollProgress = api.scrollProgress();
    const slideNodes = api.slideNodes();
    const engine = api.internalEngine();

    api.scrollSnapList().forEach((snap, snapIndex) => {
      let diffToTarget = snap - scrollProgress;

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

      const t = Math.min(Math.abs(diffToTarget), 1);
      const scale = lerp(SCALE_FOCUS, SCALE_EDGE, t);
      const opacity = lerp(OPACITY_FOCUS, OPACITY_EDGE, t);
      const blur = lerp(0, BLUR_EDGE_PX, t);

      node.style.transform = `scale(${scale})`;
      node.style.opacity = `${opacity}`;
      node.style.filter = `blur(${blur}px)`;
    });
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
    [emblaApi, pauseThenResume]
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
