'use client';

import { ChatControls } from '@/components/chat/chat-controls';
import { ChatOverlay } from '@/components/chat/chat-overlay';
import type { ChatMessage } from '@/lib/chat/messages';
import { useSessionStorageState } from '@/lib/chat/use-session-storage-state';

export type ChatDockProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
};

function ChatDock({ messages, onSubmit }: ChatDockProps) {
  const [isChatOpen, setIsChatOpen] = useSessionStorageState<boolean>('chat:dock:open', false);
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useSessionStorageState<boolean>(
    'chat:dock:transcript-collapsed',
    false
  );

  return (
    <div data-slot="chat-dock" className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute bottom-4 left-4 flex items-end gap-2">
        <ChatControls isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen((v) => !v)} />
        {isChatOpen ? (
          <ChatOverlay
            messages={messages}
            onSubmit={onSubmit}
            transcriptCollapsed={isTranscriptCollapsed}
            onToggleTranscript={() => setIsTranscriptCollapsed((v) => !v)}
          />
        ) : null}
      </div>
    </div>
  );
}

export { ChatDock };
