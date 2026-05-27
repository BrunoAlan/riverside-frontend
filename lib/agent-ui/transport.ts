'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { UiCommand } from './commands';
import { uiViewStore } from './ui-view-store';

const TOPIC = 'ui-commands';

interface EnvelopeLike {
  correlationId?: unknown;
  sessionId?: unknown;
  timestamp?: unknown;
  commands?: unknown;
}

type Store = Pick<ReturnType<typeof uiViewStore.getState>, 'applyCommand' | 'recordParseError'>;

export function dispatchEnvelope(envelope: EnvelopeLike, store: Store): void {
  const commands = Array.isArray(envelope.commands) ? envelope.commands : [];
  for (const raw of commands) {
    const result = UiCommand.safeParse(raw);
    if (result.success) {
      store.applyCommand(result.data);
      console.log('[ui-commands] applied', {
        type: result.data.type,
        correlationId: result.data.correlationId,
        payload: result.data.payload,
      });
    } else {
      const r = raw as { correlationId?: unknown };
      const correlationId = typeof r.correlationId === 'string' ? r.correlationId : undefined;
      const message = result.error.issues.map((i) => i.message).join('; ');
      store.recordParseError({ correlationId, message });
      console.warn('[ui-commands] parse error', { correlationId, message, raw });
    }
  }
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

      console.log('[ui-commands] envelope', {
        correlationId: envelope.correlationId,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestamp,
        count: Array.isArray(envelope.commands) ? envelope.commands.length : 0,
      });

      dispatchEnvelope(envelope, uiViewStore.getState());
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
