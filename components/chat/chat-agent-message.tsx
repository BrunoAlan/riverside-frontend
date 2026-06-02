'use client';

import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatAgentMessageProps = {
  children: React.ReactNode;
  streaming?: boolean;
  className?: string;
};

function ChatAgentMessage({ children, streaming, className }: ChatAgentMessageProps) {
  return (
    <p
      data-slot="chat-agent-message"
      className={cn('text-muted-foreground text-sm leading-normal whitespace-pre-wrap', className)}
    >
      {children}
      {streaming ? (
        <span aria-hidden="true" className="ml-1 animate-pulse">
          …
        </span>
      ) : null}
    </p>
  );
}

export { ChatAgentMessage };
