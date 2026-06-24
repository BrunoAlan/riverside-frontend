import {
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Euro,
  MapPin,
  Users,
} from 'lucide-react';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummaryDetails } from '@/lib/itinerary-summary/types';
import { cn } from '@/lib/shadcn/utils';

export function SummaryDetailsRow({ details }: { details: ItinerarySummaryDetails }) {
  const fields: { key: string; icon: React.ReactNode; value: string | null }[] = [
    { key: 'guests', icon: <Users className="size-4" />, value: details.guests },
    { key: 'month', icon: <CalendarDays className="size-4" />, value: details.month },
    { key: 'embarkation', icon: <MapPin className="size-4" />, value: details.embarkation },
    { key: 'stops', icon: <BookOpen className="size-4" />, value: details.stops },
    { key: 'dates', icon: <CalendarRange className="size-4" />, value: details.dates },
    { key: 'pricePerPerson', icon: <Euro className="size-4" />, value: details.pricePerPerson },
    { key: 'cabinName', icon: <BedDouble className="size-4" />, value: details.cabinName },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {fields.map((field) => (
        <span
          key={field.key}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm',
            field.value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span className="text-muted-foreground">{field.icon}</span>
          {field.value ?? SUMMARY_PLACEHOLDER.field}
        </span>
      ))}
    </div>
  );
}
