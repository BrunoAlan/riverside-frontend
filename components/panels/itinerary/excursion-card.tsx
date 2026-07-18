'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckIcon } from '@phosphor-icons/react';
import { ExcursionDetailDialog } from '@/components/panels/itinerary/excursion-detail-dialog';
import { DaysBadge } from '@/components/shared/days-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { formatDayBadge } from '@/lib/map/format-day-badge';
import { cn } from '@/lib/shadcn/utils';

const CARD_WIDTH = 320;

type ExcursionCardProps = {
  experience: Experience;
  dayOptions: string[];
  addedDays: string[];
  detailOpen: boolean;
  onDetailOpenChange: (open: boolean) => void;
  onConfirm: (day: string) => void;
};

export function ExcursionCard({
  experience,
  dayOptions,
  addedDays,
  detailOpen,
  onDetailOpenChange,
  onConfirm,
}: ExcursionCardProps) {
  const images = experience.images ?? (experience.image ? [experience.image] : []);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0] ?? '');
  // dayOptions can change (revised itinerary) while selectedDay still holds a
  // day from the previous options, so derive the effective day during render
  // instead of trusting state blindly.
  const day = dayOptions.includes(selectedDay) ? selectedDay : (dayOptions[0] ?? '');

  const isAdded = addedDays.length > 0;
  const badgeLabel = formatDayBadge(dayOptions);

  return (
    <Card
      className={cn(
        'bg-beige-50 border-beige-400/50 pointer-events-auto flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-2 shadow-none',
        isAdded && 'border-primary/40 border-2'
      )}
      style={{ width: CARD_WIDTH }}
    >
      {images.length > 0 && (
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl">
          <Image
            src={images[0]}
            alt={experience.name}
            fill
            sizes="320px"
            className="object-cover"
          />
          {badgeLabel && <DaysBadge className="absolute top-1 left-1">{badgeLabel}</DaysBadge>}
        </div>
      )}
      <p className="text-primary mt-3 line-clamp-2 px-1 text-base leading-snug font-medium">
        {experience.name}
      </p>
      <div className="mt-auto flex items-center justify-between gap-1 px-1 pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDetailOpenChange(true)}>
          View details
        </Button>
        <div className="flex items-center gap-1">
          {!isAdded && dayOptions.length > 1 && (
            <>
              <label htmlFor={`card-day-${experience.id}`} className="sr-only">
                Day for {experience.name}
              </label>
              <select
                id={`card-day-${experience.id}`}
                value={day}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-1 py-1 text-xs"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </>
          )}
          {isAdded ? (
            <span className="text-primary inline-flex items-center gap-1 px-2 text-xs font-medium">
              <CheckIcon weight="bold" aria-hidden="true" /> {addedDays.join(', ')}
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!day}
              onClick={() => onConfirm(day)}
            >
              Add
            </Button>
          )}
        </div>
      </div>
      <ExcursionDetailDialog
        experience={experience}
        images={images}
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
        dayOptions={dayOptions}
        selectedDay={day}
        onSelectDay={setSelectedDay}
        addedDays={addedDays}
        onConfirm={onConfirm}
      />
    </Card>
  );
}
