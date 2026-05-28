import type { DestinationImage } from './commands';

/**
 * Repeats whole cycles of `images` until there are at least `minCount` slides,
 * so the center-focus carousel always has side slides to peek and can loop
 * without gaps. Returns [] for an empty list.
 */
export function buildDreamSlides(images: DestinationImage[], minCount: number): DestinationImage[] {
  if (images.length === 0) return [];

  const cycles = Math.max(1, Math.ceil(minCount / images.length));
  const slides: DestinationImage[] = [];

  for (let c = 0; c < cycles; c++) {
    slides.push(...images);
  }

  return slides;
}
