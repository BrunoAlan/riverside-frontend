import { AgentHeader } from '@/components/agent/agent-header';
import { PanelSelectionProvider } from '@/components/app/panel-selection-context';
import { PanelSelector } from '@/components/app/panel-selector';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <PanelSelectionProvider>
      <div className="bg-beige-200 flex h-screen flex-col">
        <div className="relative z-40">
          <AgentHeader />
          <div className="absolute top-1/2 right-4 -translate-y-1/2">
            <PanelSelector />
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </PanelSelectionProvider>
  );
}
