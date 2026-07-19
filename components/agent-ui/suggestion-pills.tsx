'use client';

import { useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { useChatTranscription } from '@/hooks/use-chat-transcription';
import { useBookingSummary, useUiView } from '@/lib/agent-ui/hooks';
import { cn } from '@/lib/shadcn/utils';
import { type SuggestionPill, pillsForView } from '@/lib/suggestions/pills';

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
  const summary = useBookingSummary();
  const connectionState = useConnectionState();
  const { sendMessage } = useChatTranscription();
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  const pills = pillsForView(view.type);

  // Sending text needs a connected room, so a pill tapped before the session is
  // connected would fail to send. Hide the row until the room is connected.
  if (connectionState !== ConnectionState.Connected) return null;
  if (pills.length === 0) return null;
  if (dismissedAt === view.type) return null;

  return (
    // `z-30` keeps the row above the chat dock (`z-20`); the wide-viewport
    // padding keeps it clear of the dock's 360px chat overlay lane on the left.
    <div className="pointer-events-none relative z-30 flex justify-center px-18 pb-4 xl:px-[26.5rem]">
      <SuggestionPills
        pills={pills}
        stacked={summary === null}
        onSelect={(pill) => {
          const dismissedView = view.type;
          setDismissedAt(dismissedView);
          // Restore the row if the send fails so a dropped message does not
          // strand the user with no suggestions.
          sendMessage(pill.message ?? pill.label).catch(() => {
            setDismissedAt((current) => (current === dismissedView ? null : current));
          });
        }}
      />
    </div>
  );
}
