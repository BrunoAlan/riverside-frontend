'use client';

import { useEffect } from 'react';
import type { TextStreamHandler } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { UiCommand } from './commands';
import { uiViewStore } from './ui-view-store';

const TOPIC = 'ui-commands';

interface ReaderLike {
  readAll: () => Promise<string>;
}

type ApplyFn = (cmd: import('./commands').UiCommand) => void;
type RecordErrorFn = (err: { correlationId?: string; message: string }) => void;

export async function handleUiCommandStream(
  reader: ReaderLike,
  applyCommand: ApplyFn,
  recordError: RecordErrorFn
): Promise<void> {
  const raw = await reader.readAll();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    recordError({ message: `JSON parse error: ${(e as Error).message}` });
    return;
  }
  const result = UiCommand.safeParse(json);
  if (!result.success) {
    const correlationId =
      typeof json === 'object' && json !== null && 'correlation_id' in json
        ? String((json as { correlation_id?: unknown }).correlation_id)
        : undefined;
    recordError({ correlationId, message: result.error.message });
    return;
  }
  applyCommand(result.data);
}

export function useUiCommandTransport(): void {
  const room = useMaybeRoomContext();
  useEffect(() => {
    if (!room) return;
    const handler: TextStreamHandler = (reader) => {
      const { applyCommand, recordParseError } = uiViewStore.getState();
      handleUiCommandStream(reader, applyCommand, recordParseError).catch((e) => {
        recordParseError({ message: `transport error: ${(e as Error).message}` });
      });
    };
    room.registerTextStreamHandler(TOPIC, handler);
    return () => {
      room.unregisterTextStreamHandler(TOPIC);
    };
  }, [room]);
}
