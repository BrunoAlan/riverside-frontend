'use client';

import { useUiView } from '@/lib/agent-ui/hooks';
import { FallbackView } from './fallback-view';
import { HintOverlay } from './hint-overlay';
import { VIEW_REGISTRY } from './view-registry';

export const ContentView = ({ ref }: React.ComponentProps<'div'>) => {
  const view = useUiView();
  const Component = VIEW_REGISTRY[view.type];

  return (
    <div ref={ref} className="relative z-10 h-full">
      {Component ? <Component view={view as never} /> : <FallbackView />}
      <HintOverlay />
    </div>
  );
};
