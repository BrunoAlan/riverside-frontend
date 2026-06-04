'use client';

import { type RefObject, useEffect, useState } from 'react';

/**
 * Tracks whether a scroll container is scrolled away from its top/bottom edges,
 * so callers can fade in gradient overlays. Re-evaluates on scroll, on resize,
 * and whenever `deps` change (e.g. the rendered list grows).
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateFadeState = () => {
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setShowTopFade(!atTop);
      setShowBottomFade(!atBottom);
    };

    updateFadeState();
    el.addEventListener('scroll', updateFadeState);

    const observer = new ResizeObserver(updateFadeState);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateFadeState);
      observer.disconnect();
    };
    // `deps` is a caller-supplied dependency list spread intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return { showTopFade, showBottomFade };
}
