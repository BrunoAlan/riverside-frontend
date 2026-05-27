'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';

const TOPIC = 'ui-commands';

interface EnvelopeLike {
  correlationId?: unknown;
  sessionId?: unknown;
  timestamp?: unknown;
  commands?: unknown;
}

export function useUiCommandTransport(): void {
  const room = useMaybeRoomContext();
  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic !== TOPIC) return;

      let text: string;
      try {
        text = new TextDecoder().decode(payload);
      } catch (e) {
        console.warn('[ui-commands] decode error', e);
        return;
      }

      let envelope: EnvelopeLike;
      try {
        envelope = JSON.parse(text) as EnvelopeLike;
      } catch (e) {
        console.warn('[ui-commands] JSON parse error', { error: e, text });
        return;
      }

      const commands = Array.isArray(envelope.commands) ? envelope.commands : [];
      const correlationId =
        typeof envelope.correlationId === 'string' ? envelope.correlationId : undefined;

      if (commands.length === 0) {
        console.debug('[ui-commands] empty envelope', { correlationId });
        return;
      }

      console.log('[ui-commands] envelope', {
        correlationId,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestamp,
        count: commands.length,
      });

      for (const command of commands) {
        const c = command as { type?: unknown; correlationId?: unknown; payload?: unknown };
        console.log('[ui-commands] command', {
          type: c.type,
          correlationId: c.correlationId,
          payload: c.payload,
        });
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
