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

export const SUGGESTION_PILLS: SuggestionPill[] = [
  {
    id: 'vienna-christmas',
    label: 'Plan a romantic Christmas getaway in Vienna',
    views: ['presentation', 'dream_stage'],
  },
  { id: 'budapest', label: 'Tell me about Budapest' },
  { id: 'river-vs-ocean', label: 'What makes river cruises different from ocean cruises?' },
];

export function pillsForView(
  viewType: UiView['type'],
  pills: SuggestionPill[] = SUGGESTION_PILLS
): SuggestionPill[] {
  return pills.filter((pill) => !pill.views || pill.views.includes(viewType));
}
