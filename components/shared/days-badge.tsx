import type { ReactNode } from 'react';
import { cn } from '@/lib/shadcn/utils';

// Beige pill showing a city's day labels (e.g. "Days 1, 2 & 8"). Positioning is
// layout-specific (absolute over a card image vs. in-flow), so callers pass it
// via `className`.
export function DaysBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'bg-beige-200 text-primary rounded-md px-3 py-1 text-sm whitespace-nowrap',
        className
      )}
    >
      {children}
    </span>
  );
}
