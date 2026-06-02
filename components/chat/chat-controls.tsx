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
  'pointer-events-auto size-10 rounded-xl bg-beige-300 hover:bg-beige-400/40 text-primary backdrop-blur-md cursor-pointer';

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
        className={cn(buttonBase, 'bg-red-300/40 hover:bg-red-400/40')}
      >
        <PhoneOff className="stroke-red-500" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={handleToggleMic}
        disabled={micPending}
        aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micEnabled}
        className={cn(buttonBase)}
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
        className={cn(buttonBase, isChatOpen ? 'bg-beige-400/60' : '')}
      >
        <MessageSquare />
      </Button>
    </div>
  );
}

export { ChatControls };
