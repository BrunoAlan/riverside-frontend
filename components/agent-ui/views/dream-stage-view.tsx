'use client';

import { PanelDream } from '@/components/panels/dream/panel-dream';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function DreamStageView({ view }: { view: Extract<UiView, { type: 'dream_stage' }> }) {
  return <PanelDream images={view.images} />;
}
