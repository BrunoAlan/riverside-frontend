'use client';

import { useCallback } from 'react';
import { CabinCard } from '@/components/panels/cabin/cabin-card';
import { type Cabin, cabins } from '@/lib/cabins';

export function PanelCabinSelection() {
  const handleExpand = useCallback((cabin: Cabin) => {
    // TODO: wire up expand behavior (e.g. open a detail panel for `cabin`).
    console.log('expand cabin', cabin.id);
  }, []);

  return (
    <div className="bg-beige-200 h-full w-full overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-3">
        {cabins.map((cabin) => (
          <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
        ))}
      </div>
    </div>
  );
}
