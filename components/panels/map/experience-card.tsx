'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { cn } from '@/lib/shadcn/utils';

type ExperienceCardProps = {
  experience: Experience;
  expanded: boolean;
  onToggle: () => void;
};

export function ExperienceCard({ experience, expanded, onToggle }: ExperienceCardProps) {
  const images = experience.images ?? (experience.image ? [experience.image] : []);
  const cardRef = useRef<HTMLDivElement>(null);

  // On expand, nudge the scroll panel just enough to bring the now-taller card fully into view.
  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  return (
    <Card
      ref={cardRef}
      className="bg-beige-50 border-beige-400/50 flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
    >
      {expanded && images.length > 0 && <ExperienceGallery images={images} alt={experience.name} />}
      <div>
        <div className="flex grow items-center justify-between gap-2">
          <div className="text-primary text-base leading-snug font-medium">{experience.name}</div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0"
            aria-label={expanded ? `Collapse ${experience.name}` : `Expand ${experience.name}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <CaretDownIcon
              weight="bold"
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        </div>
        {experience.venue && (
          <p className="text-muted-foreground mt-1 text-sm">{experience.venue}</p>
        )}
        {expanded && (
          <p className="text-primary/80 mt-2 text-sm leading-relaxed">{experience.description}</p>
        )}
      </div>
      {expanded && (
        <div className="mt-3 flex items-center justify-end gap-2 px-2 pb-1">
          {/* TODO: wire Confirm/Reject to the agent — decision payload not yet defined */}
          <Button type="button" variant="ghost" size="sm" onClick={() => {}}>
            Reject
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
            Confirm
          </Button>
        </div>
      )}
    </Card>
  );
}

function ExperienceGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="mb-2 flex flex-col gap-2">
      <div className="relative h-36 w-full overflow-hidden rounded-lg">
        <Image src={activeSrc} alt={alt} fill sizes="440px" className="object-cover" />
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
