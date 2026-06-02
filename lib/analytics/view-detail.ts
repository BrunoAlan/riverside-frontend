import type { UiView } from '@/lib/agent-ui/ui-view-types';

// The id of the open detail within a view, or null when no detail is open.
// Both itinerary city detail and cabin detail live as sub-state of their view.
export function getViewDetailId(view: UiView): string | null {
  if (view.type === 'itinerary') return view.detailCityId ?? null;
  if (view.type === 'cabin_selection') return view.detailCabinId ?? null;
  return null;
}
