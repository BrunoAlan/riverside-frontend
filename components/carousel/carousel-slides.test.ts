import { describe, expect, it } from 'vitest';
import { buildCarouselSlides } from './carousel-slides';

const img = (n: number) => ({ url: `/dream/${n}.jpg`, caption: `cap ${n}` });

describe('buildCarouselSlides', () => {
  it('leaves the list untouched when there are already enough images', () => {
    const images = [img(1), img(2), img(3), img(4), img(5)];
    const slides = buildCarouselSlides(images, 5);
    expect(slides).toHaveLength(5);
    expect(slides.map((s) => s.url)).toEqual(images.map((i) => i.url));
  });

  it('clones in order to reach the minimum count', () => {
    const slides = buildCarouselSlides([img(1), img(2)], 5);
    expect(slides).toHaveLength(6);
    expect(slides.map((s) => s.caption)).toEqual([
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
      'cap 1',
      'cap 2',
    ]);
  });

  it('handles a single image', () => {
    const slides = buildCarouselSlides([img(1)], 5);
    expect(slides).toHaveLength(5);
    expect(new Set(slides.map((s) => s.url))).toEqual(new Set(['/dream/1.jpg']));
  });

  it('returns an empty array for no images', () => {
    expect(buildCarouselSlides([], 5)).toEqual([]);
  });
});
