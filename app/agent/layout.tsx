import { AgentHeader } from '@/components/agent/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="bg-beige-200 relative h-screen overflow-hidden">
      <main className="h-full">{children}</main>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center">
        <AgentHeader />
      </div>
    </div>
  );
}
