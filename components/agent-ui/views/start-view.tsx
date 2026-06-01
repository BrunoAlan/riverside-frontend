'use client';

import { useEffect } from 'react';
import { useSessionContext } from '@livekit/components-react';
import { useAppConfig } from '@/components/layout/app-config-context';
import { WelcomeView } from '@/components/layout/welcome-view';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import { useVoiceStore } from '@/lib/agent-ui/voice-store';

export function StartView() {
  const { start } = useSessionContext();
  const setView = useSetViewFromUser();
  const config = useAppConfig();

  const voices = config.voices ?? [];
  const voiceId = useVoiceStore((s) => s.voiceId);
  const setVoiceId = useVoiceStore((s) => s.setVoiceId);

  // Seed the store with the configured default the first time we render with a
  // catalog but no selection yet, so the default voice is sent as metadata even
  // if the user never opens the dropdown.
  useEffect(() => {
    if (voiceId === null && config.defaultVoiceId) {
      setVoiceId(config.defaultVoiceId);
    }
  }, [voiceId, config.defaultVoiceId, setVoiceId]);

  const handleStart = () => {
    setView({ type: 'presentation' });
    start();
  };

  return (
    <WelcomeView
      startButtonText={config.startButtonText}
      onStartCall={handleStart}
      voices={voices}
      selectedVoiceId={voiceId}
      onSelectVoice={setVoiceId}
    />
  );
}
