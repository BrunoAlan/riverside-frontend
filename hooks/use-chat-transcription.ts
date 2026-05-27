'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextStreamHandler } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { type ChatMessage, appendMessage } from '@/lib/chat/messages';

const CHAT_TOPIC = 'lk.chat';
const TRANSCRIPTION_TOPIC = 'lk.transcription';

export type UseChatTranscription = {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
};

export function useChatTranscription(): UseChatTranscription {
  const room = useMaybeRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (!room) return;

    const makeHandler =
      (role: ChatMessage['role']): TextStreamHandler =>
      async (reader, participantInfo) => {
        const localIdentity = room.localParticipant?.identity;
        const isLocal = participantInfo.identity === localIdentity;
        const resolvedRole: ChatMessage['role'] = isLocal ? 'user' : role;
        const content = await reader.readAll();
        const id = reader.info.id;
        setMessages((list) => appendMessage(list, { id, role: resolvedRole, content }));
      };

    const chatHandler = makeHandler('user');
    const transcriptionHandler = makeHandler('agent');

    room.registerTextStreamHandler(CHAT_TOPIC, chatHandler);
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, transcriptionHandler);

    return () => {
      room.unregisterTextStreamHandler(CHAT_TOPIC);
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
    };
  }, [room]);

  const sendMessage = useCallback(async (text: string) => {
    const current = roomRef.current;
    if (!current?.localParticipant) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const info = await current.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
    setMessages((list) => appendMessage(list, { id: info.id, role: 'user', content: trimmed }));
  }, []);

  return { messages, sendMessage };
}
