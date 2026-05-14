import { AgentHeader } from '@/components/agent/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-beige-200">
      <AgentHeader />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
