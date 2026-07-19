'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import type { SuggestionPill } from '@/lib/suggestions/pills';

interface SuggestionPillsProps {
  pills: SuggestionPill[];
  /** Stack vertically (no booking summary) instead of a single row. */
  stacked: boolean;
  onSelect: (pill: SuggestionPill) => void;
}

export function SuggestionPills({ pills, stacked, onSelect }: SuggestionPillsProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex gap-2',
        stacked ? 'flex-col items-center' : 'flex-wrap justify-center'
      )}
    >
      {pills.map((pill) => (
        <Button
          key={pill.id}
          variant="secondary"
          size="sm"
          className="bg-card/95 border-beige-300 h-auto rounded-full border px-4 py-2 text-sm whitespace-normal backdrop-blur"
          onClick={() => onSelect(pill)}
        >
          {pill.label}
        </Button>
      ))}
    </div>
  );
}
