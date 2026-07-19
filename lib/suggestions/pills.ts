import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type SuggestionPill = {
  /** Stable identifier. Used as the React key. */
  id: string;
  /** Text shown on the pill. */
  label: string;
  /** Text sent to the agent. Defaults to `label`. */
  message?: string;
  /** Views this pill appears on. Omit to show it on every view. */
  views?: UiView['type'][];
};

/**
 * The pills offered to the user, in display order.
 *
 * By default the pill's `label` is what gets sent to the agent. Set `message` to
 * send something different — useful when a short chip should expand into a fuller
 * prompt:
 *
 *   { id: 'more-like-this', label: 'More like this', message: 'Show me more itineraries similar to this one' }
 *
 * Omit `views` to show a pill on every view.
 */
export const SUGGESTION_PILLS: SuggestionPill[] = [
  {
    id: 'vienna-christmas',
    label: 'Plan a romantic Christmas getaway in Vienna',
    views: ['presentation'],
  },
  { id: 'budapest', label: 'Tell me about Budapest', views: ['presentation', 'itinerary'] },
  {
    id: 'river-vs-ocean',
    label: 'What makes river cruises different from ocean cruises?',
    views: ['presentation'],
  },
  {
    id: 'stops-highlights',
    label: 'What can I do at each stop?',
    views: ['itinerary'],
  },
  {
    id: 'excursions',
    label: 'Show me the excursions',
    message: 'Show me the excursions available on this itinerary',
    views: ['itinerary'],
  },
  {
    id: 'whats-included',
    label: "What's included?",
    message: 'What is included in the price of this cruise?',
    views: ['itinerary'],
  },
  {
    id: 'best-time',
    label: 'When is the best time to go?',
    message: 'When is the best time of year to do this itinerary?',
    views: ['itinerary'],
  },
];

export function pillsForView(
  viewType: UiView['type'],
  pills: SuggestionPill[] = SUGGESTION_PILLS
): SuggestionPill[] {
  return pills.filter((pill) => !pill.views || pill.views.includes(viewType));
}
