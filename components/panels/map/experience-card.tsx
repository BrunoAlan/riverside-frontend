'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { cn } from '@/lib/shadcn/utils';

type ExperienceCardProps = {
  experience: Experience;
  expanded: boolean;
  onToggle: () => void;
  dayOptions: string[];
  addedDays: string[];
  onConfirm: (day: string) => void;
};

export function ExperienceCard({
  experience,
  expanded,
  onToggle,
  dayOptions,
  addedDays,
  onConfirm,
}: ExperienceCardProps) {
  const images = experience.images ?? (experience.image ? [experience.image] : []);
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0] ?? '');

  // On expand, nudge the scroll panel just enough to bring the now-taller card fully into view.
  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  const isAdded = addedDays.length > 0;
  const isSelectedDayAdded = addedDays.includes(selectedDay);

  return (
    <Card
      ref={cardRef}
      className={cn(
        'bg-beige-50 border-beige-400/50 flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none',
        isAdded && 'border-primary/40 bg-primary/5'
      )}
    >
      {expanded && images.length > 0 && <ExperienceGallery images={images} alt={experience.name} />}
      <div>
        <div className="flex grow items-center justify-between gap-2">
          <div className="flex min-w-0 grow flex-wrap items-center gap-2">
            <span className="text-primary text-base leading-snug font-medium">
              {experience.name}
            </span>
            {isAdded && (
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                <CheckIcon weight="bold" aria-hidden="true" /> Added · {addedDays.join(', ')}
              </span>
            )}
          </div>
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
        <div className="mt-3 flex items-center justify-between gap-2 px-2 pb-1">
          <label htmlFor={`day-${experience.id}`} className="sr-only">
            Day for {experience.name}
          </label>
          <select
            id={`day-${experience.id}`}
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            disabled={dayOptions.length === 0}
            className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-2 py-1 text-sm"
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            {/* Reject is not yet wired — no intent defined for it. */}
            <Button type="button" variant="ghost" size="sm" onClick={() => {}}>
              Reject
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSelectedDayAdded || !selectedDay}
              onClick={() => onConfirm(selectedDay)}
            >
              {isSelectedDayAdded ? (
                <>
                  <CheckIcon weight="bold" /> Added
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
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
