import { describe, expect, it } from 'vitest';
import { buildDreamSlides } from './dream-slides';

const img = (n: number) => ({ url: `/dream/${n}.jpg`, caption: `cap ${n}` });

describe('buildDreamSlides', () => {
  it('leaves the list untouched when there are already enough images', () => {
    const images = [img(1), img(2), img(3), img(4), img(5)];
    const slides = buildDreamSlides(images, 5);
    expect(slides).toHaveLength(5);
    expect(slides.map((s) => s.url)).toEqual(images.map((i) => i.url));
  });

  it('clones in order to reach the minimum count', () => {
    const slides = buildDreamSlides([img(1), img(2)], 5);
    expect(slides).toHaveLength(6); // 2 -> 3 whole cycles to reach >= 5
    expect(slides.map((s) => s.caption)).toEqual([
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
    ]);
  });

  it('preserves the original index for each slide so the caption is stable', () => {
    const slides = buildDreamSlides([img(1), img(2)], 5);
    expect(slides.map((s) => s.originalIndex)).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('handles a single image', () => {
    const slides = buildDreamSlides([img(1)], 5);
    expect(slides).toHaveLength(5);
    expect(new Set(slides.map((s) => s.url))).toEqual(new Set(['/dream/1.jpg']));
  });

  it('returns an empty array for no images', () => {
    expect(buildDreamSlides([], 5)).toEqual([]);
  });
});
