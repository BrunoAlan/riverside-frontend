'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { BookingSummaryContainer } from '@/components/agent-ui/booking-summary';
import { AppConfigProvider } from '@/components/layout/app-config-context';
import { ViewController } from '@/components/layout/view-controller';
import { AgentSessionProvider } from '@/components/livekit/agent-session-provider';
import { StartAudioButton } from '@/components/livekit/start-audio-button';
import { useAgentErrors } from '@/hooks/use-agent-errors';
import { useDebugMode } from '@/hooks/use-debug';
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
import { DevPanel } from '@/lib/dev/dev-panel';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AppConfigProvider config={appConfig}>
      <AgentSessionProvider session={session}>
        <AppSetup />
        <div className="grid h-full grid-cols-1 grid-rows-1">
          <ViewController />
        </div>
        <BookingSummaryContainer />
        <StartAudioButton label="Start Audio" />
        {IN_DEVELOPMENT && <DevPanel />}
      </AgentSessionProvider>
    </AppConfigProvider>
  );
}
