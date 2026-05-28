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
export function buildDreamSlides(images: DestinationImage[], minCount: number): DreamSlide[] {
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
