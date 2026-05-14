'use client';

import { AnimatePresence } from 'motion/react';
import { AgentChatIndicator } from '@/components/agents-ui/agent-chat-indicator';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatUserMessage } from '@/components/chat/chat-user-message';

export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

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
