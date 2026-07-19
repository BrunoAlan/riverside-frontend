import { APP_CONFIG_DEFAULTS } from '@/app-config';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type SuggestionPill = {
  /** Stable identifier. Used as the React key, so it must be unique. */
  id: string;
  /** Text shown on the pill. */
  label: string;
  /** Text sent to the agent. Defaults to `label`. */
  message?: string;
  /** Views this pill appears on. Omit to show it on every view. */
  views?: UiView['type'][];
};

export function pillsForView(
  viewType: UiView['type'],
  pills: SuggestionPill[] = APP_CONFIG_DEFAULTS.suggestionPills
): SuggestionPill[] {
  return pills.filter((pill) => !pill.views || pill.views.includes(viewType));
}
