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

    const handler: TextStreamHandler = async (reader, participantInfo) => {
      const localIdentity = room.localParticipant?.identity;
      const role: ChatMessage['role'] =
        participantInfo.identity === localIdentity ? 'user' : 'agent';
      const id = reader.info.id;
      let content = '';
      for await (const chunk of reader) {
        content += chunk;
        setMessages((list) => appendMessage(list, { id, role, content, streaming: true }));
      }
      setMessages((list) => appendMessage(list, { id, role, content, streaming: false }));
    };

    room.registerTextStreamHandler(CHAT_TOPIC, handler);
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handler);

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
