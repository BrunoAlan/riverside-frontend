import { CoverflowCarousel } from '@/components/carousel/coverflow-carousel';
import type { DestinationImage } from '@/lib/agent-ui/commands';

interface PanelDreamProps {
  images: DestinationImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  return <CoverflowCarousel images={images} />;
}
