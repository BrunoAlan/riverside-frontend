import { useEffect } from 'react';
import { useUiView } from '@/lib/agent-ui/hooks';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';

export function useViewAnalytics() {
  const view = useUiView();

  useEffect(() => {
    if (view.type === 'start') return;
    captureEvent(ANALYTICS_EVENTS.agentViewShown, { view_type: view.type });
  }, [view.type]);
}
