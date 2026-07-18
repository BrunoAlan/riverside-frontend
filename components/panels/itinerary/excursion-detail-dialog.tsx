'use client';

import { CheckIcon } from '@phosphor-icons/react';
import { ExperienceGallery } from '@/components/shared/experience-gallery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Experience } from '@/lib/agent-ui/commands';

type ExcursionDetailDialogProps = {
  experience: Experience;
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOptions: string[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  addedDays: string[];
  onConfirm: (day: string) => void;
};

export function ExcursionDetailDialog({
  experience,
  images,
  open,
  onOpenChange,
  dayOptions,
  selectedDay,
  onSelectDay,
  addedDays,
  onConfirm,
}: ExcursionDetailDialogProps) {
  const isSelectedDayAdded = addedDays.includes(selectedDay);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-beige-50 border-beige-400/50 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl leading-snug">{experience.name}</DialogTitle>
          {experience.venue && (
            <DialogDescription className="text-muted-foreground text-sm">
              {experience.venue}
            </DialogDescription>
          )}
        </DialogHeader>
        {images.length > 0 && (
          <ExperienceGallery
            images={images}
            alt={experience.name}
            heroClassName="h-56"
            heroSizes="512px"
          />
        )}
        <p className="text-primary/80 text-sm leading-relaxed">{experience.description}</p>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`dialog-day-${experience.id}`} className="sr-only">
            Day for {experience.name}
          </label>
          <select
            id={`dialog-day-${experience.id}`}
            value={selectedDay}
            onChange={(event) => onSelectDay(event.target.value)}
            disabled={dayOptions.length === 0}
            className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-2 py-1 text-sm"
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
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
              'Add'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
