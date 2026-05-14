'use client';

import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatAgentMessageProps = {
  children: React.ReactNode;
  className?: string;
};

function ChatAgentMessage({ children, className }: ChatAgentMessageProps) {
  return (
    <p
      data-slot="chat-agent-message"
      className={cn(
        'text-muted-foreground text-base leading-normal whitespace-pre-wrap',
        className
      )}
    >
      {children}
    </p>
  );
}

export { ChatAgentMessage };
