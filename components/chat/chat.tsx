'use client';

import { AnimatePresence } from 'motion/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import { AgentChatIndicator } from '@/components/livekit/agent-chat-indicator';

export type { ChatMessage } from '@/lib/chat/messages';

export type ChatProps = {
  messages: ChatMessage[];
  agentThinking?: boolean;
  className?: string;
};

function Chat({ messages, agentThinking = false, className }: ChatProps) {
  return (
    <Conversation className={className}>
      <ConversationContent>
        {messages.map((message) =>
          message.role === 'user' ? (
            <ChatUserMessage key={message.id}>{message.content}</ChatUserMessage>
          ) : (
            <ChatAgentMessage key={message.id}>{message.content}</ChatAgentMessage>
          )
        )}
        <AnimatePresence>{agentThinking && <AgentChatIndicator size="sm" />}</AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export { Chat };
