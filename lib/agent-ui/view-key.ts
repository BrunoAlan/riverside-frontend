import type { UiView } from './ui-view-types';

/**
 * Identity of the view's *content*, not just its kind.
 *
 * `view.type` alone is not enough for `compare_itinerary`: two comparisons of
 * different options are different views and must not be treated as the same one
 * (for remount keys, dismissal state, etc.).
 */
export function viewKey(view: UiView): string {
  if (view.type === 'compare_itinerary') {
    return `compare_itinerary:${view.options.map((o) => o.id).join(',')}`;
  }
  return view.type;
}
