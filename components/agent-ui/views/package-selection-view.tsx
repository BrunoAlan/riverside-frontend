'use client';

import { PanelPackageSelection } from '@/components/panels/package/panel-package-selection';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function PackageSelectionView({
  view,
}: {
  view: Extract<UiView, { type: 'package_selection' }>;
}) {
  return <PanelPackageSelection view={view} />;
}
