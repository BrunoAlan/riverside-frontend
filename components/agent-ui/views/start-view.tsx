'use client';

import { useSessionContext } from '@livekit/components-react';
import { useAppConfig } from '@/components/app/app-config-context';
import { WelcomeView } from '@/components/app/welcome-view';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';

export function StartView() {
  const { start } = useSessionContext();
  const setView = useSetViewFromUser();
  const config = useAppConfig();

  const handleStart = () => {
    setView({ type: 'presentation' });
    start();
  };

  return <WelcomeView startButtonText={config.startButtonText} onStartCall={handleStart} />;
}
