'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import { Button } from '@/components/ui/button';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import type { ChatMessage } from '@/lib/chat/messages';
import { cn } from '@/lib/shadcn/utils';

export type ChatOverlayProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  transcriptCollapsed: boolean;
  onToggleTranscript: () => void;
  className?: string;
};

function ChatOverlay({
  messages,
  onSubmit,
  transcriptCollapsed,
  onToggleTranscript,
  className,
}: ChatOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade } = useScrollFade(scrollRef, [messages, transcriptCollapsed]);

  useEffect(() => {
    if (transcriptCollapsed) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, transcriptCollapsed]);

  return (
    <div
      data-slot="chat-overlay"
      className={cn(
        'bg-beige-50 pointer-events-auto relative flex w-[360px] flex-col overflow-hidden rounded-2xl p-2 shadow-xl backdrop-blur-md',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 pt-1 pr-1">
        <span className="text-sm font-medium">Conversation history</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onToggleTranscript}
          aria-label={transcriptCollapsed ? 'Expand transcript' : 'Collapse transcript'}
          aria-expanded={!transcriptCollapsed}
          aria-controls="chat-transcript"
          className="hover:bg-beige-300 size-8 cursor-pointer rounded-full"
        >
          {transcriptCollapsed ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>

      {!transcriptCollapsed && (
        <div
          className={`from-beige-50 pointer-events-none absolute top-[50px] right-0 left-0 z-1 h-[45px] bg-gradient-to-b transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'} `}
        />
      )}

      {!transcriptCollapsed ? (
        <div
          id="chat-transcript"
          ref={scrollRef}
          aria-live="polite"
          className="relative flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-3 py-3"
        >
          {messages.map((m) =>
            m.role === 'user' ? (
              <ChatUserMessage key={m.id}>{m.content}</ChatUserMessage>
            ) : (
              <ChatAgentMessage key={m.id} streaming={m.streaming}>
                {m.content}
              </ChatAgentMessage>
            )
          )}
        </div>
      ) : null}

      {!transcriptCollapsed && (
        <div
          className={`from-beige-50 pointer-events-none absolute right-0 bottom-[60px] left-0 z-1 h-[45px] bg-gradient-to-t transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
        />
      )}

      <ChatInput className="rounded-lg border-0 bg-white" onSubmit={onSubmit} />
    </div>
  );
}

export { ChatOverlay };
