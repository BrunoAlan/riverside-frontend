'use client';

import { createContext, useContext } from 'react';
import { type UseChatTranscription, useChatTranscription } from '@/hooks/use-chat-transcription';

const ChatTranscriptionContext = createContext<UseChatTranscription | null>(null);

/**
 * Owns the single `useChatTranscription()` instance for the app.
 *
 * The hook registers LiveKit text stream handlers for the `lk.chat` and
 * `lk.transcription` topics, and `Room.registerTextStreamHandler` throws when a
 * topic already has a handler. Mounting this provider once — inside the room
 * context — and reading it from every consumer keeps the registration and the
 * transcript state in one place.
 */
export function ChatTranscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useChatTranscription();
  return (
    <ChatTranscriptionContext.Provider value={value}>{children}</ChatTranscriptionContext.Provider>
  );
}

export function useChatTranscriptionContext(): UseChatTranscription {
  const ctx = useContext(ChatTranscriptionContext);
  if (!ctx) {
    throw new Error('useChatTranscriptionContext must be used within ChatTranscriptionProvider');
  }
  return ctx;
}
