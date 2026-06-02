import { useEffect } from 'react';
import { useUiView } from '@/lib/agent-ui/hooks';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';

export function useViewAnalytics() {
  const view = useUiView();

  useEffect(() => {
    captureEvent(ANALYTICS_EVENTS.agentViewShown, { view_type: view.type });
  }, [view.type]);
}
