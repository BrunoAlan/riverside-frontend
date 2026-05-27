'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';

// 'ui-commands' is owned by useUiCommandTransport; lk.* are owned by components-react.
const WILDCARD_TOPICS = ['ui_commands'];

export function useDebugUiTransport(): void {
  const room = useMaybeRoomContext();
  useEffect(() => {
    if (!room) return;
    const tag = '[ui-debug]';

    const onData = (
      payload: Uint8Array,
      participant?: { identity?: string },
      _kind?: unknown,
      topic?: string
    ) => {
      let text: string;
      try {
        text = new TextDecoder().decode(payload);
      } catch {
        text = `<${payload.byteLength} bytes>`;
      }
      let parsed: unknown = undefined;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* not JSON */
      }
      console.log(tag, 'DataReceived', {
        topic,
        from: participant?.identity,
        bytes: payload.byteLength,
        text,
        parsed,
      });
    };
    room.on(RoomEvent.DataReceived, onData);

    const textHandlers = WILDCARD_TOPICS.map((topic) => {
      const handler = async (reader: { readAll: () => Promise<string>; info?: unknown }) => {
        try {
          const raw = await reader.readAll();
          let parsed: unknown = undefined;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* not JSON */
          }
          console.log(tag, 'TextStream', { topic, info: reader.info, raw, parsed });
        } catch (e) {
          console.warn(tag, 'TextStream error', topic, e);
        }
      };
      try {
        room.registerTextStreamHandler(topic, handler);
        return topic;
      } catch (e) {
        console.warn(tag, 'could not register text handler', topic, e);
        return null;
      }
    });

    console.log(tag, 'attached. room.name=', room.name, 'state=', room.state);

    return () => {
      room.off(RoomEvent.DataReceived, onData);
      for (const topic of textHandlers) {
        if (topic) {
          try {
            room.unregisterTextStreamHandler(topic);
          } catch {
            /* noop */
          }
        }
      }
    };
  }, [room]);
}
