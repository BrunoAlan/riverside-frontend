'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/chat/messages';

type ChatMockState = {
  messages: ChatMessage[] | null;
  setMessages: (next: ChatMessage[] | null) => void;
};

const DEVTOOLS_ENABLED = process.env.NODE_ENV !== 'production';

export const useChatMockStore = create<ChatMockState>()(
  devtools(
    (set) => ({
      messages: null,
      setMessages: (next) => set({ messages: next }, false, 'setMessages'),
    }),
    { name: 'chat-mock-store', enabled: DEVTOOLS_ENABLED }
  )
);

export const useDevChatMessages = () => useChatMockStore((s) => s.messages);
export const useSetDevChatMessages = () => useChatMockStore((s) => s.setMessages);
