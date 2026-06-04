import {
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Euro,
  MapPin,
  Users,
} from 'lucide-react';
import type { ItinerarySummaryDetails } from '@/lib/itinerary-summary/types';

export function SummaryDetailsRow({ details }: { details: ItinerarySummaryDetails }) {
  const fields: { icon: React.ReactNode; label: string }[] = [
    { icon: <Users className="size-4" />, label: details.guests },
    { icon: <CalendarDays className="size-4" />, label: details.month },
    { icon: <MapPin className="size-4" />, label: details.embarkation },
    { icon: <BookOpen className="size-4" />, label: details.stops },
    { icon: <CalendarRange className="size-4" />, label: details.dates },
    { icon: <Euro className="size-4" />, label: details.pricePerPerson },
    { icon: <BedDouble className="size-4" />, label: details.cabinName },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {fields.map((field) => (
        <span
          key={field.label}
          className="text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <span className="text-muted-foreground">{field.icon}</span>
          {field.label}
        </span>
      ))}
    </div>
  );
}
