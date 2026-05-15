import dynamic from 'next/dynamic';
import { AgentHeader } from '@/components/agent/agent-header';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function PanelMap() {
  return (
    <div className="fixed inset-0">
      <MapCanvas />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <AgentHeader />
      </div>
    </div>
  );
}
