'use client';

import { CONTENT_PANELS } from '@/components/app/content-panels/registry';
import { usePanelSelection } from '@/components/app/panel-selection-context';

export const ContentView = ({ ref }: React.ComponentProps<'div'>) => {
  const { activeId } = usePanelSelection();

  const activePanel = CONTENT_PANELS.find((panel) => panel.id === activeId) ?? CONTENT_PANELS[0];
  const ActivePanel = activePanel.component;

  return (
    <div ref={ref} className="relative z-10 h-full">
      <ActivePanel />
    </div>
  );
};
