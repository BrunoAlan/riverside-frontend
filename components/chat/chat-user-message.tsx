'use client';

import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatUserMessageProps = {
  children: React.ReactNode;
  className?: string;
};

function ChatUserMessage({ children, className }: ChatUserMessageProps) {
  return (
    <p
      data-slot="chat-user-message"
      className={cn(
        'text-foreground text-right text-sm leading-normal whitespace-pre-wrap',
        className
      )}
    >
      {children}
    </p>
  );
}

export { ChatUserMessage };
