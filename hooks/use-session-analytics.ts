import { useEffect, useRef } from 'react';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { voiceStore } from '@/lib/agent-ui/voice-store';
import { computeDurationSeconds } from '@/lib/analytics/duration';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';

export function useSessionAnalytics() {
  const agent = useAgent();
  const { isConnected } = useSessionContext();
  const startMsRef = useRef<number | null>(null);
  const wasConnectedRef = useRef(false);
  const erroredRef = useRef(false);

  // session_started / session_ended on connection transitions.
  useEffect(() => {
    const voiceId = voiceStore.getState().voiceId;
    if (isConnected && !wasConnectedRef.current) {
      wasConnectedRef.current = true;
      erroredRef.current = false;
      startMsRef.current = Date.now();
      captureEvent(ANALYTICS_EVENTS.sessionStarted, { voice_id: voiceId });
    } else if (!isConnected && wasConnectedRef.current) {
      wasConnectedRef.current = false;
      const start = startMsRef.current ?? Date.now();
      captureEvent(ANALYTICS_EVENTS.sessionEnded, {
        duration_seconds: computeDurationSeconds(start, Date.now()),
        voice_id: voiceId,
      });
      startMsRef.current = null;
    }
  }, [isConnected]);

  // agent_error when the agent reports a failure during a connected session.
  useEffect(() => {
    if (isConnected && agent.state === 'failed' && !erroredRef.current) {
      erroredRef.current = true;
      const start = startMsRef.current ?? Date.now();
      captureEvent(ANALYTICS_EVENTS.agentError, {
        reasons: agent.failureReasons ?? [],
        duration_seconds: computeDurationSeconds(start, Date.now()),
      });
    }
  }, [isConnected, agent.state, agent.failureReasons]);
}
