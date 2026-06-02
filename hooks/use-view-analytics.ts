import { useEffect } from 'react';
import { useUiView } from '@/lib/agent-ui/hooks';
import { uiViewStore } from '@/lib/agent-ui/ui-view-store';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';
import { getViewDetailId } from '@/lib/analytics/view-detail';

export function useViewAnalytics() {
  const view = useUiView();

  useEffect(() => {
    if (view.type === 'start') return;
    captureEvent(ANALYTICS_EVENTS.agentViewShown, { view_type: view.type });
  }, [view.type]);

  // Fire when a detail drill-in opens within a view (city / cabin). Both the
  // agent (applyCommand) and a user click (setViewFromUser) only mutate the
  // store, so observing it here covers both paths in one place.
  const detailId = getViewDetailId(view);

  useEffect(() => {
    if (detailId === null) return; // only opens; closing (id -> null) is silent
    // Read source imperatively: it is set in the same store update as detailId,
    // and keeping it out of the dep array avoids re-firing when an unrelated
    // command (e.g. set_booking_summary) changes only `source`.
    const source = uiViewStore.getState().source;
    if (source !== 'agent' && source !== 'user') return; // dev/initial never tracked
    captureEvent(ANALYTICS_EVENTS.agentViewDetailShown, {
      view_type: view.type,
      detail_id: detailId,
      source,
    });
  }, [view.type, detailId]);
}
