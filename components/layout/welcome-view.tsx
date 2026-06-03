import { MicrophoneIcon, SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Voice {
  id: string;
  label: string;
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  voices: Voice[];
  selectedVoiceId: string | null;
  onSelectVoice: (id: string) => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  voices,
  selectedVoiceId,
  onSelectVoice,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="relative z-10 flex h-full items-center justify-center p-6">
      <section className="bg-beige-50 mb-[90px] flex w-full max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center shadow-xl">
        <div className="text-foreground mb-6 flex items-center gap-4">
          <MicrophoneIcon size={22} weight="regular" />
          <SpeakerHighIcon size={22} weight="regular" />
        </div>

        <h1 className="text-foreground text-2xl font-medium">Welcome Aboard</h1>

        <p className="text-muted-foreground mt-3 max-w-prose leading-6">
          Please grant the concierge permission to use your microphone and play sound.
        </p>

        <div className="mt-7 flex items-center gap-2">
          <Button size="lg" onClick={onStartCall} className="rounded-lg px-4 py-2">
            {startButtonText}
          </Button>

          {voices.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  variant="ghost"
                  aria-label="Select agent voice"
                  className="rounded-lg px-3 py-2"
                >
                  <SpeakerHighIcon size={20} weight="regular" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Voice</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={selectedVoiceId ?? undefined}
                  onValueChange={onSelectVoice}
                >
                  {voices.map((voice) => (
                    <DropdownMenuRadioItem key={voice.id} value={voice.id}>
                      {voice.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </section>
    </div>
  );
};
