import { Fragment } from 'react';
import { cn } from '@/lib/shadcn/utils';

// Inline list of short strings joined by a thin vertical pipe. Used for cabin
// meta rows and the itinerary country list. Spacing on both sides of the pipe
// is driven by the container gap, so callers pass it via `className`.
export function PipeSeparatedList({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn('text-muted-foreground flex flex-wrap items-center text-sm', className)}>
      {items.map((item, i) => (
        <Fragment key={item}>
          {i > 0 && <span className="bg-accent h-3 w-px" aria-hidden />}
          <span>{item}</span>
        </Fragment>
      ))}
    </div>
  );
}
