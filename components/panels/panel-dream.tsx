import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { DreamImage } from '@/lib/agent-ui/commands';

interface DreamSlot {
  mask: string;
  /** Desktop collage position, as CSS length strings (percentages). */
  top: string;
  left: string;
  width: string;
  height: string;
}

const DREAM_SLOTS: DreamSlot[] = [
  { mask: '/dream/masks/blob-1.svg', top: '6%', left: '3%', width: '33%', height: '33%' },
  { mask: '/dream/masks/blob-2.svg', top: '12%', left: '31%', width: '40%', height: '40%' },
  { mask: '/dream/masks/blob-3.svg', top: '8%', left: '65%', width: '32%', height: '32%' },
  { mask: '/dream/masks/blob-4.svg', top: '47%', left: '8%', width: '35%', height: '35%' },
  { mask: '/dream/masks/blob-5.svg', top: '49%', left: '60%', width: '37%', height: '36%' },
];

interface PanelDreamProps {
  images: DreamImage[];
}

export function PanelDream({ images }: PanelDreamProps) {
  const visible = images.slice(0, DREAM_SLOTS.length);

  return (
    <div className="bg-beige-200 h-full w-full overflow-y-auto md:flex md:items-center md:justify-center md:overflow-hidden">
      <div className="flex flex-col gap-8 py-10 md:relative md:block md:h-full md:max-h-[960px] md:w-full md:max-w-[1400px] md:py-0">
        {visible.map((image, index) => {
          const slot = DREAM_SLOTS[index];
          const positionVars = {
            '--dream-top': slot.top,
            '--dream-left': slot.left,
            '--dream-width': slot.width,
            '--dream-height': slot.height,
          } as CSSProperties;

          const maskStyle: CSSProperties = {
            maskImage: `url(${slot.mask})`,
            WebkitMaskImage: `url(${slot.mask})`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          };

          return (
            <div
              key={`${index}-${image.src}`}
              style={positionVars}
              className="relative mx-auto h-64 w-[85%] shrink-0 md:absolute md:top-[var(--dream-top)] md:left-[var(--dream-left)] md:mx-0 md:h-[var(--dream-height)] md:w-[var(--dream-width)]"
            >
              <div className="absolute inset-0" style={maskStyle}>
                <Image
                  src={image.src}
                  alt={image.tag}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 768px) 85vw, 35vw"
                  className="object-cover"
                />
              </div>
              <span className="bg-beige-900/85 absolute bottom-[28%] left-[24%] rounded-full px-3 py-1 text-xs text-white">
                {image.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
