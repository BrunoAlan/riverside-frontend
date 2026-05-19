'use client';

import { WindowBackground } from '@/components/app/window-background';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function DiscoveryCanvasView({}: { view: Extract<UiView, { type: 'discovery_canvas' }> }) {
  return <WindowBackground isPlaying />;
}
