'use client';

import { useMemo } from 'react';
import { LogLevel } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { BookingSummaryContainer } from '@/components/agent-ui/booking-summary';
import { ChatDock } from '@/components/chat/chat-dock';
import { AppConfigProvider } from '@/components/layout/app-config-context';
import { ViewController } from '@/components/layout/view-controller';
import { AgentSessionProvider } from '@/components/livekit/agent-session-provider';
import { StartAudioButton } from '@/components/livekit/start-audio-button';
import { useAgentErrors } from '@/hooks/use-agent-errors';
import { useChatTranscription } from '@/hooks/use-chat-transcription';
import { useDebugMode } from '@/hooks/use-debug';
import { useSessionAnalytics } from '@/hooks/use-session-analytics';
import { useViewAnalytics } from '@/hooks/use-view-analytics';
import { useUiView } from '@/lib/agent-ui/hooks';
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
import { useDevChatMessages } from '@/lib/dev/chat-mock-store';
import { DevPanel } from '@/lib/dev/dev-panel';
import { getLocalTokenSource, getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT, logLevel: LogLevel.error });
  useAgentErrors();
  useUiCommandTransport();
  useSessionAnalytics();
  useViewAnalytics();
  return null;
}

function ChatDockContainer() {
  const view = useUiView();
  const { messages: liveMessages, sendMessage } = useChatTranscription();
  const mockMessages = useDevChatMessages();
  if (view.type === 'start') return null;
  const messages = mockMessages ?? liveMessages;
  return <ChatDock messages={messages} onSubmit={sendMessage} />;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : getLocalTokenSource(appConfig);
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AppConfigProvider config={appConfig}>
      <AgentSessionProvider session={session}>
        <AppSetup />
        <div className="relative flex h-full flex-col">
          <div className="relative min-h-0 flex-1">
            <ViewController />
          </div>
          <BookingSummaryContainer />
          <ChatDockContainer />
        </div>
        <StartAudioButton label="Start Audio" />
        {IN_DEVELOPMENT && <DevPanel />}
      </AgentSessionProvider>
    </AppConfigProvider>
  );
}
