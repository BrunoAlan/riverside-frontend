'use client';

import { useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState } from '@livekit/components-react';
import { CHAT_DOCK_OPEN_LANE_PX, CHAT_DOCK_OPEN_STORAGE_KEY } from '@/components/chat/chat-dock';
import { useChatTranscriptionContext } from '@/components/layout/chat-transcription-context';
import { Button } from '@/components/ui/button';
import { useUiSource, useUiView, useVisibleBookingSummary } from '@/lib/agent-ui/hooks';
import { viewKey } from '@/lib/agent-ui/view-key';
import { useSessionStorageState } from '@/lib/chat/use-session-storage-state';
import { cn } from '@/lib/shadcn/utils';
import { type SuggestionPill, pillsForView } from '@/lib/suggestions/pills';

/** Gutter between the pills and the open chat overlay. */
const LANE_GUTTER_PX = 16;

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

interface SuggestionPillsProps {
  pills: SuggestionPill[];
  /** Stack vertically (no booking summary) instead of a single row. */
  stacked: boolean;
  onSelect: (pill: SuggestionPill) => void;
}

export function SuggestionPills({ pills, stacked, onSelect }: SuggestionPillsProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex gap-2',
        stacked ? 'flex-col items-center' : 'flex-wrap justify-center'
      )}
    >
      {pills.map((pill) => (
        <Button
          key={pill.id}
          variant="secondary"
          size="sm"
          className="bg-card/95 hover:bg-card border-beige-300 h-auto rounded-full border px-4 py-2 text-sm whitespace-normal backdrop-blur"
          onClick={() => onSelect(pill)}
        >
          {pill.label}
        </Button>
      ))}
    </div>
  );
}

export function SuggestionPillsContainer() {
  const view = useUiView();
  const summary = useVisibleBookingSummary();
  const connectionState = useConnectionState();
  const source = useUiSource();
  const { sendMessage } = useChatTranscriptionContext();
  const [isChatOpen] = useSessionStorageState<boolean>(CHAT_DOCK_OPEN_STORAGE_KEY, false);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  const pills = pillsForView(view.type);
  const currentKey = viewKey(view);

  // Sending text needs a connected room, so a pill tapped before the session is
  // connected would fail to send. Hide the row until the room is connected —
  // except for views the dev panel pushed, which exist precisely to be designed
  // against with no backend. Tapping a pill there fails to send and the row
  // comes back via the rollback below. Never softened in production.
  const isDevPreview = IN_DEVELOPMENT && source === 'dev';
  if (!isDevPreview && connectionState !== ConnectionState.Connected) return null;
  if (pills.length === 0) return null;
  if (dismissedAt === currentKey) return null;

  return (
    // `z-30` keeps the row above the chat dock (`z-20`), so the row must clear
    // the overlay's lane itself — but only while the overlay exists, and only on
    // the left, so narrow viewports keep the full remaining width.
    <div
      className="pointer-events-none relative z-30 flex justify-center px-18 pb-4"
      style={isChatOpen ? { paddingLeft: CHAT_DOCK_OPEN_LANE_PX + LANE_GUTTER_PX } : undefined}
    >
      <SuggestionPills
        pills={pills}
        stacked={summary === null}
        onSelect={(pill) => {
          setDismissedAt(currentKey);
          // Restore the row if the send fails so a dropped message does not
          // strand the user with no suggestions.
          void sendMessage(pill.message ?? pill.label).catch(() => {
            setDismissedAt((current) => (current === currentKey ? null : current));
          });
        }}
      />
    </div>
  );
}
