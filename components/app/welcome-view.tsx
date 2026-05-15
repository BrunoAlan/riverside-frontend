import { Microphone, SpeakerHigh } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="flex items-center justify-center p-6">
      <section className="bg-beige-50 flex w-full max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center shadow-xl">
        <div className="text-fg0 mb-6 flex items-center gap-4">
          <Microphone size={22} weight="regular" />
          <SpeakerHigh size={22} weight="regular" />
        </div>

        <h1 className="text-foreground text-2xl font-medium">Welcome Aboard</h1>

        <p className="text-muted-foreground mt-3 max-w-prose leading-6">
          Please grant the concierge permission to use your microphone and play sound.
        </p>

        <Button size="lg" onClick={onStartCall} className="mt-7 rounded-full px-8">
          {startButtonText}
        </Button>
      </section>
    </div>
  );
};
