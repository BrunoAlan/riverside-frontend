'use client';

import { useCallback } from 'react';
import { CabinCard } from '@/components/panels/cabin/cabin-card';
import { CabinDetailModal } from '@/components/panels/cabin/cabin-detail-modal';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Cabin } from '@/lib/agent-ui/commands';
import { useSelectedCabinId, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

type PanelCabinSelectionProps = {
  view: Extract<UiView, { type: 'cabin_selection' }>;
};

export function PanelCabinSelection({ view }: PanelCabinSelectionProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const selectedCabinId = useSelectedCabinId();

  const { cabins } = view;

  const handleExpand = useCallback(
    (cabin: Cabin) => {
      setViewFromUser({ type: 'cabin_selection', cabins, detailCabinId: cabin.id });
      void sendIntent('explore_cabin', {
        entities: { cabin_id: cabin.id },
        userMessage: `User opened ${cabin.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, cabins]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'cabin_selection', cabins });
    void sendIntent('view_cabin_selection', {
      userMessage: 'User closed cabin detail',
    });
  }, [setViewFromUser, sendIntent, cabins]);

  const handleSelect = useCallback(
    (cabin: Cabin) => {
      void sendIntent('select_cabin', {
        entities: { cabin_id: cabin.id },
        userMessage: `User selected ${cabin.name}`,
      });
    },
    [sendIntent]
  );

  const detailCabin = view.detailCabinId
    ? (cabins.find((cabin) => cabin.id === view.detailCabinId) ?? null)
    : null;

  return (
    <div className="bg-beige-200 relative h-full w-full overflow-hidden">
      <div className="h-full overflow-y-auto" inert={detailCabin != null}>
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-10 p-6 pt-16 sm:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-3">
          {cabins.map((cabin) => (
            <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
          ))}
        </div>
      </div>
      <CabinDetailModal
        cabin={detailCabin}
        onClose={handleClose}
        onSelect={handleSelect}
        selected={detailCabin != null && selectedCabinId === detailCabin.id}
      />
    </div>
  );
}
