import type { LocalParticipant } from 'livekit-client';

export const FRONTEND_INTENT_TOPIC = 'frontend-intent';

// Outbound UI event to the deterministic backend. Mirrors the FrontendIntent v1
// contract: the backend skips the LLM classifier and runs `intent` directly.
export type FrontendIntent = {
  version: 'v1';
  topic: typeof FRONTEND_INTENT_TOPIC;
  intent: string;
  entities?: Record<string, unknown>;
  user_message?: string;
  correlationId?: string;
};

type BuildOptions = {
  entities?: Record<string, unknown>;
  userMessage?: string;
  correlationId?: string;
};

export function buildFrontendIntent(intent: string, opts: BuildOptions = {}): FrontendIntent {
  return {
    version: 'v1',
    topic: FRONTEND_INTENT_TOPIC,
    intent,
    ...(opts.entities ? { entities: opts.entities } : {}),
    ...(opts.userMessage ? { user_message: opts.userMessage } : {}),
    ...(opts.correlationId ? { correlationId: opts.correlationId } : {}),
  };
}

export async function publishFrontendIntent(
  participant: LocalParticipant,
  envelope: FrontendIntent
): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  await participant.publishData(bytes, { topic: FRONTEND_INTENT_TOPIC, reliable: true });
}
