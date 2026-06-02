// Analytics event names and their payload shapes. The single source of truth
// for what we send to PostHog. Keep names stable — PostHog insights key off them.

export const ANALYTICS_EVENTS = {
  testerIdentified: 'tester_identified',
  sessionStarted: 'session_started',
  sessionEnded: 'session_ended',
  agentError: 'agent_error',
  agentViewShown: 'agent_view_shown',
  agentViewDetailShown: 'agent_view_detail_shown',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventProps = {
  [ANALYTICS_EVENTS.testerIdentified]: { name: string; email: string };
  [ANALYTICS_EVENTS.sessionStarted]: { voice_id: string | null };
  [ANALYTICS_EVENTS.sessionEnded]: { duration_seconds: number; voice_id: string | null };
  [ANALYTICS_EVENTS.agentError]: { reasons: string[]; duration_seconds: number };
  [ANALYTICS_EVENTS.agentViewShown]: { view_type: string };
  [ANALYTICS_EVENTS.agentViewDetailShown]: {
    view_type: string;
    detail_id: string;
    source: 'agent' | 'user';
  };
};
