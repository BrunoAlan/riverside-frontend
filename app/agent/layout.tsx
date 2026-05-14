import { AgentHeader } from '@/components/agent/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="bg-beige-200 flex h-screen flex-col">
      <AgentHeader />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
