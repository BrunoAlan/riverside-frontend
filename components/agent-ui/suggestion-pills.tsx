'use client';

import { useState } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
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
  const room = useMaybeRoomContext();
  const { sendMessage } = useChatTranscription();
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  const pills = pillsForView(view.type);

  // `sendMessage` silently no-ops without a connected local participant, so a
  // pill tapped before the room connects would do nothing. Hide until it does.
  if (!room?.localParticipant) return null;
  if (pills.length === 0) return null;
  if (dismissedAt === view.type) return null;

  return (
    <div className="pointer-events-none flex justify-center px-18 pb-4">
      <SuggestionPills
        pills={pills}
        stacked={summary === null}
        onSelect={(pill) => {
          setDismissedAt(view.type);
          void sendMessage(pill.message ?? pill.label);
        }}
      />
    </div>
  );
}
