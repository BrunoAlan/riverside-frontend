'use client';

import {
  BookOpen,
  CalendarDays,
  Clock,
  Euro,
  MapPin,
  Maximize2,
  Save,
  Share,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookingSummary, useUiView } from '@/lib/agent-ui/hooks';
import type { BookingSummary as BookingSummaryType } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/shadcn/utils';

interface BookingSummaryProps {
  summary: BookingSummaryType;
}

interface SummaryFieldProps {
  icon: React.ReactNode;
  label: string;
  muted?: boolean;
}

function SummaryField({ icon, label, muted = false }: SummaryFieldProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        muted ? 'text-muted-foreground' : 'text-foreground'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </span>
  );
}

interface SlotProps {
  label: string;
  state: 'active' | 'filled' | 'empty';
}

function Slot({ label, state }: SlotProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs',
        state === 'active' && 'bg-muted text-foreground underline underline-offset-2',
        state === 'filled' && 'bg-muted text-foreground',
        state === 'empty' && 'border-muted-foreground/40 text-muted-foreground border border-dashed'
      )}
    >
      {label}
    </span>
  );
}

export function BookingSummary({ summary }: BookingSummaryProps) {
  const stopsLabel = summary.stops
    ? summary.stops.extra > 0
      ? `${summary.stops.primary} +${summary.stops.extra}`
      : summary.stops.primary
    : null;

  return (
    <div
      className={cn(
        'border-border bg-card/95 pointer-events-auto rounded-2xl border px-5 py-3 shadow-lg backdrop-blur',
        'flex w-fit max-w-[1100px] min-w-[640px] flex-col gap-2'
      )}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <SummaryField
            icon={<Users className="size-4" />}
            label={summary.people?.label ?? 'People'}
            muted={!summary.people}
          />
          <SummaryField
            icon={<CalendarDays className="size-4" />}
            label={summary.month?.label ?? 'Month'}
            muted={!summary.month}
          />
          <SummaryField
            icon={<MapPin className="size-4" />}
            label={summary.embarkation?.label ?? 'Embark'}
            muted={!summary.embarkation}
          />
          <SummaryField
            icon={<BookOpen className="size-4" />}
            label={stopsLabel ?? 'Stops'}
            muted={!stopsLabel}
          />
          <SummaryField
            icon={<Clock className="size-4" />}
            label={summary.duration?.label ?? 'Days'}
            muted={!summary.duration}
          />
          <SummaryField
            icon={<Euro className="size-4" />}
            label={summary.price?.label ?? 'Price'}
            muted={!summary.price}
          />
        </div>

        <Button variant="secondary" size="sm" className="gap-2">
          <Maximize2 className="size-3.5" />
          Itinerary Summary
        </Button>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {summary.slots.map((slot, i) => (
            <Slot key={`${slot.label}-${i}`} label={slot.label} state={slot.state} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Share">
            <Share className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Save">
            <Save className="size-4" />
          </Button>
          <Button disabled={!summary.cta.enabled}>{summary.cta.label}</Button>
        </div>
      </div>
    </div>
  );
}

export function BookingSummaryContainer() {
  const view = useUiView();
  const summary = useBookingSummary();

  if (view.type === 'start') return null;
  if (summary === null) return null;

  return (
    <div className="pointer-events-none absolute right-0 bottom-0 z-20 flex justify-end px-6 pb-6">
      <BookingSummary summary={summary} />
    </div>
  );
}
