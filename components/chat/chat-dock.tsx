'use client';

import { ChatControls } from '@/components/chat/chat-controls';
import { CHAT_OVERLAY_WIDTH_PX, ChatOverlay } from '@/components/chat/chat-overlay';
import type { ChatMessage } from '@/lib/chat/messages';
import { useSessionStorageState } from '@/lib/chat/use-session-storage-state';

/** Session-storage key holding whether the chat overlay is open. */
export const CHAT_DOCK_OPEN_STORAGE_KEY = 'chat:dock:open';

const DOCK_INSET_PX = 16; // `left-4` on the dock row
const CONTROLS_WIDTH_PX = 40; // `size-10` buttons in ChatControls
const CONTROLS_GAP_PX = 8; // `gap-2` between controls and overlay

/**
 * Width of the screen edge the open dock occupies, measured from the left edge.
 * Content that must not sit under the overlay clears at least this much.
 */
export const CHAT_DOCK_OPEN_LANE_PX =
  DOCK_INSET_PX + CONTROLS_WIDTH_PX + CONTROLS_GAP_PX + CHAT_OVERLAY_WIDTH_PX;

export type ChatDockProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
};

function ChatDock({ messages, onSubmit }: ChatDockProps) {
  const [isChatOpen, setIsChatOpen] = useSessionStorageState<boolean>(
    CHAT_DOCK_OPEN_STORAGE_KEY,
    false
  );
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
