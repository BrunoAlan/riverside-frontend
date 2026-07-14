'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/shadcn/utils';

export type ItineraryTab = 'overview' | 'excursions';

type ItineraryTabsProps = {
  value: ItineraryTab;
  onChange: (value: ItineraryTab) => void;
};

const TABS: { value: ItineraryTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'excursions', label: 'Excursions' },
];

export function ItineraryTabs({ value, onChange }: ItineraryTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ItineraryTab)}>
      <TabsList className="h-auto gap-1 rounded-full bg-white/95 p-1 shadow-sm">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium',
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none',
              'data-[state=inactive]:bg-beige-200 data-[state=inactive]:text-primary'
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
