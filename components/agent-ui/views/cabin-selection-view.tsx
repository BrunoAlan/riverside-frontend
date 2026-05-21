'use client';

import { PanelCabinSelection } from '@/components/panels/cabin/panel-cabin-selection';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function CabinSelectionView({
  view,
}: {
  view: Extract<UiView, { type: 'cabin_selection' }>;
}) {
  return <PanelCabinSelection view={view} />;
}
