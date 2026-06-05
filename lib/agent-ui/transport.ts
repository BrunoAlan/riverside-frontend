'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { recordDevEvent } from '../dev/record-dev-event';
import { UiCommand, UiCommandEnvelope } from './commands';
import { uiViewStore } from './ui-view-store';
import { decodeText } from './wire';

const TOPIC = 'ui-commands';

type Store = Pick<ReturnType<typeof uiViewStore.getState>, 'applyCommand' | 'recordParseError'>;

// Validate the inbound envelope, then parse and apply each command in order.
// Failures are recorded to the dev event log, never thrown: a malformed envelope
// yields one `envelope-error` event; a malformed command yields one
// `parse-error` event and is skipped.
export function dispatchEnvelope(envelope: unknown, store: Store): void {
  const parsed = UiCommandEnvelope.safeParse(envelope);
  if (!parsed.success) {
    console.warn('[ui-commands] envelope error', envelope);
    recordDevEvent({
      channel: 'ui-commands',
      label: 'envelope-error',
      ok: false,
      payload: envelope,
    });
    return;
  }

  for (const rawCommand of parsed.data.commands) {
    const result = UiCommand.safeParse(rawCommand);
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
      const rawId = (rawCommand as { correlationId?: unknown }).correlationId;
      const correlationId = typeof rawId === 'string' ? rawId : undefined;
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      store.recordParseError({ correlationId, message });
      console.warn('[ui-commands] parse error', { correlationId, message, rawCommand });
      recordDevEvent({
        channel: 'ui-commands',
        label: 'parse-error',
        correlationId,
        ok: false,
        payload: rawCommand,
        envelope,
      });
    }
  }
}

// Subscribe the current LiveKit room to `ui-commands` data messages and feed each
// decoded envelope to `dispatchEnvelope`. Decode and JSON-parse failures (before
// an envelope object exists) are recorded to the dev event log.
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
        text = decodeText(payload);
      } catch (err) {
        console.warn('[ui-commands] decode error', err);
        recordDevEvent({
          channel: 'ui-commands',
          label: 'decode-error',
          ok: false,
          payload: String(err),
        });
        return;
      }

      let envelope: unknown;
      try {
        envelope = JSON.parse(text);
      } catch (err) {
        console.warn('[ui-commands] JSON parse error', { error: err, text });
        recordDevEvent({
          channel: 'ui-commands',
          label: 'json-error',
          ok: false,
          payload: { error: String(err), text },
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
