'use client';

import { Track } from 'livekit-client';
import { MessageSquare, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useSessionContext, useTrackToggle } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import { cn } from '@/lib/shadcn/utils';

export type ChatControlsProps = {
  isChatOpen: boolean;
  onToggleChat: () => void;
  className?: string;
};

const buttonBase =
  'pointer-events-auto size-10 rounded-full border border-white/10 backdrop-blur-md';

function ChatControls({ isChatOpen, onToggleChat, className }: ChatControlsProps) {
  const session = useSessionContext();
  const setView = useSetViewFromUser();
  const {
    enabled: micEnabled,
    toggle: toggleMic,
    pending: micPending,
  } = useTrackToggle({
    source: Track.Source.Microphone,
  });

  const handleEndCall = async () => {
    await session.end();
    setView({ type: 'start' });
  };

  const handleToggleMic = () => {
    void toggleMic();
  };

  return (
    <div data-slot="chat-controls" className={cn('flex flex-col gap-2', className)}>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        onClick={() => void handleEndCall()}
        aria-label="End call"
        className={cn(buttonBase)}
      >
        <PhoneOff />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={handleToggleMic}
        disabled={micPending}
        aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micEnabled}
        className={cn(buttonBase, 'bg-background/40')}
      >
        {micEnabled ? <Mic /> : <MicOff />}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={onToggleChat}
        aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
        aria-pressed={isChatOpen}
        className={cn(
          buttonBase,
          isChatOpen ? 'bg-primary text-primary-foreground' : 'bg-background/40'
        )}
      >
        <MessageSquare />
      </Button>
    </div>
  );
}

export { ChatControls };
