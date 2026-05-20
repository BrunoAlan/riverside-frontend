import { AgentHeader } from '@/components/agent-ui/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="bg-beige-200 relative h-screen overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 z-40 -translate-x-1/2">
        <AgentHeader />
      </div>
      <main className="h-full">{children}</main>
    </div>
  );
}
