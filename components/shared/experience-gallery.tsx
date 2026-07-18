'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/shadcn/utils';

// Hero image plus a thumbnail strip. Used by the map overlay's experience card and
// by the Excursions detail dialog, which differ only in hero size.
export function ExperienceGallery({
  images,
  alt,
  heroClassName,
  heroSizes,
}: {
  images: string[];
  alt: string;
  heroClassName: string;
  heroSizes: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('relative w-full overflow-hidden rounded-lg', heroClassName)}>
        <Image src={activeSrc} alt={alt} fill sizes={heroSizes} className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition',
                index === activeIndex ? 'ring-primary ring-2' : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
