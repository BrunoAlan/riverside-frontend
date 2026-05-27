'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/lib/chat/messages';
import { cn } from '@/lib/shadcn/utils';

export type ChatOverlayProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  className?: string;
};

const fadeMask = 'linear-gradient(to top, black 60%, transparent)';

function ChatOverlay({ messages, onSubmit, className }: ChatOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, collapsed]);

  const hasMessages = messages.length > 0;

  return (
    <div
      data-slot="chat-overlay"
      className={cn(
        'pointer-events-none absolute bottom-4 left-4 z-20 flex w-[360px] flex-col gap-2',
        className
      )}
    >
      {hasMessages ? (
        <div className="relative flex justify-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
            aria-expanded={!collapsed}
            className="bg-background/40 pointer-events-auto size-7 rounded-full border border-white/10 backdrop-blur-md"
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      ) : null}

      {!collapsed && hasMessages ? (
        <div
          aria-live="polite"
          className="bg-background/40 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md"
        >
          <div
            ref={scrollRef}
            className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-3 py-3"
            style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <ChatUserMessage key={m.id}>{m.content}</ChatUserMessage>
              ) : (
                <ChatAgentMessage key={m.id}>{m.content}</ChatAgentMessage>
              )
            )}
          </div>
        </div>
      ) : null}

      <ChatInput
        className="pointer-events-auto"
        placeholder="Type here to exit voice mode..."
        onSubmit={onSubmit}
      />
    </div>
  );
}

export { ChatOverlay };
