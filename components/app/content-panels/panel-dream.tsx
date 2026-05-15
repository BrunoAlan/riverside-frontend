import type { CSSProperties } from 'react';
import Image from 'next/image';

interface DreamImage {
  src: string;
  mask: string;
  tag: string;
  /** Desktop collage position, as CSS length strings (percentages). */
  top: string;
  left: string;
  width: string;
  height: string;
}

const DREAM_IMAGES: DreamImage[] = [
  {
    src: '/dream/1.png',
    mask: '/dream/masks/blob-1.svg',
    tag: '1 – Image Tag',
    top: '9%',
    left: '6%',
    width: '28%',
    height: '25%',
  },
  {
    src: '/dream/2.jpg',
    mask: '/dream/masks/blob-2.svg',
    tag: '1 – Image Tag',
    top: '14%',
    left: '37%',
    width: '36%',
    height: '32%',
  },
  {
    src: '/dream/3.png',
    mask: '/dream/masks/blob-3.svg',
    tag: '1 – Image Tag',
    top: '12%',
    left: '72%',
    width: '25%',
    height: '25%',
  },
  {
    src: '/dream/4.png',
    mask: '/dream/masks/blob-4.svg',
    tag: '1 – Image Tag',
    top: '50%',
    left: '13%',
    width: '28%',
    height: '28%',
  },
  {
    src: '/dream/5.jpg',
    mask: '/dream/masks/blob-5.svg',
    tag: '1 – Image Tag',
    top: '52%',
    left: '66%',
    width: '30%',
    height: '27%',
  },
];

export function PanelDream() {
  return (
    <div className="bg-beige-200 relative flex h-full w-full flex-col gap-8 overflow-y-auto py-10 md:block md:gap-0 md:overflow-hidden md:py-0">
      {DREAM_IMAGES.map((image, index) => {
        const positionVars = {
          '--dream-top': image.top,
          '--dream-left': image.left,
          '--dream-width': image.width,
          '--dream-height': image.height,
        } as CSSProperties;

        const maskStyle: CSSProperties = {
          maskImage: `url(${image.mask})`,
          WebkitMaskImage: `url(${image.mask})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        };

        return (
          <div
            key={image.src}
            style={positionVars}
            className="relative mx-auto h-64 w-[85%] shrink-0 md:absolute md:top-[var(--dream-top)] md:left-[var(--dream-left)] md:mx-0 md:h-[var(--dream-height)] md:w-[var(--dream-width)]"
          >
            <div className="absolute inset-0" style={maskStyle}>
              <Image
                src={image.src}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 85vw, 35vw"
                className="object-cover"
              />
            </div>
            <span className="bg-beige-900/85 absolute bottom-[18%] left-[14%] rounded-full px-3 py-1 text-xs text-white">
              {image.tag}
            </span>
          </div>
        );
      })}
    </div>
  );
}
