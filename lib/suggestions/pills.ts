export type SuggestionPill = {
  /** Stable identifier. Used as the React key, so it must be unique. */
  id: string;
  /** Text shown on the pill. */
  label: string;
  /** Text sent to the agent. Defaults to `label`. */
  message?: string;
};
