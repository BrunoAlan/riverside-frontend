'use client';

import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import type { ChatMessage } from '@/lib/chat/messages';
import { cn } from '@/lib/shadcn/utils';

export type ChatOverlayProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  className?: string;
};

function ChatOverlay({ messages, onSubmit, className }: ChatOverlayProps) {
  const lastUser = messages.findLast((m) => m.role === 'user');
  const lastAgent = messages.findLast((m) => m.role === 'agent');

  const fadeMask = 'linear-gradient(to top, black 60%, transparent)';

  return (
    <div
      data-slot="chat-overlay"
      className={cn(
        'pointer-events-none absolute bottom-4 left-4 z-20 flex w-[360px] flex-col gap-2',
        className
      )}
    >
      <div
        className="flex max-h-[50vh] flex-col gap-3 overflow-hidden px-1"
        style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
      >
        {lastUser ? <ChatUserMessage>{lastUser.content}</ChatUserMessage> : null}
        {lastAgent ? <ChatAgentMessage>{lastAgent.content}</ChatAgentMessage> : null}
      </div>
      <div className="h-8" aria-hidden />
      <ChatInput
        className="pointer-events-auto"
        placeholder="Type here to exit voice mode..."
        onSubmit={onSubmit}
      />
    </div>
  );
}

export { ChatOverlay };
