'use client';

import { create } from 'zustand';
import type { ChatMessage } from '@/lib/chat/messages';

type ChatMockState = {
  messages: ChatMessage[] | null;
  setMessages: (next: ChatMessage[] | null) => void;
};

export const useChatMockStore = create<ChatMockState>((set) => ({
  messages: null,
  setMessages: (next) => set({ messages: next }),
}));

export const useDevChatMessages = () => useChatMockStore((s) => s.messages);
export const useSetDevChatMessages = () => useChatMockStore((s) => s.setMessages);
