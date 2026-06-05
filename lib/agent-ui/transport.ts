'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { recordDevEvent } from '../dev/record-dev-event';
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
      recordDevEvent({
        channel: 'ui-commands',
        label: result.data.type,
        correlationId: result.data.correlationId,
        ok: true,
        payload: result.data,
        envelope,
      });
    } else {
      const r = raw as { correlationId?: unknown };
      const correlationId = typeof r.correlationId === 'string' ? r.correlationId : undefined;
      const message = result.error.issues.map((i) => i.message).join('; ');
      store.recordParseError({ correlationId, message });
      recordDevEvent({
        channel: 'ui-commands',
        label: 'parse-error',
        correlationId,
        ok: false,
        payload: raw,
        envelope,
      });
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
        recordDevEvent({
          channel: 'ui-commands',
          label: 'decode-error',
          ok: false,
          payload: String(e),
        });
        return;
      }

      let envelope: EnvelopeLike;
      try {
        envelope = JSON.parse(text) as EnvelopeLike;
      } catch (e) {
        recordDevEvent({
          channel: 'ui-commands',
          label: 'json-error',
          ok: false,
          payload: { error: String(e), text },
        });
        return;
      }

      dispatchEnvelope(envelope, uiViewStore.getState());
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
