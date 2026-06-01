'use client';

import { useCallback, useRef } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { buildFrontendIntent, publishFrontendIntent } from '@/lib/agent-ui/frontend-intent';

type SendIntentOptions = {
  entities?: Record<string, unknown>;
  userMessage?: string;
};

export function useFrontendIntent(): (intent: string, opts?: SendIntentOptions) => Promise<void> {
  const room = useMaybeRoomContext();
  const roomRef = useRef(room);
  roomRef.current = room;

  return useCallback(async (intent: string, opts: SendIntentOptions = {}) => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    await publishFrontendIntent(participant, buildFrontendIntent(intent, opts));
  }, []);
}
