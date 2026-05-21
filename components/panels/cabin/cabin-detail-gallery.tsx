'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/shadcn/utils';

type CabinDetailGalleryProps = {
  images: string[];
  alt: string;
};

export function CabinDetailGallery({ images, alt }: CabinDetailGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        <Image
          src={activeSrc}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex shrink-0 gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg transition',
                index === activeIndex
                  ? 'ring-primary ring-2 ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
