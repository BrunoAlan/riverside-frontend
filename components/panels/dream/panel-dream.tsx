'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { DreamImage } from '@/lib/agent-ui/commands';

interface DreamSlot {
  /** Desktop collage position, as CSS length strings (percentages). */
  top: string;
  left: string;
  width: string;
  height: string;
}

const DREAM_SLOTS: DreamSlot[] = [
  { top: '6%', left: '3%', width: '33%', height: '33%' },
  { top: '12%', left: '31%', width: '40%', height: '40%' },
  { top: '8%', left: '65%', width: '32%', height: '32%' },
  { top: '47%', left: '8%', width: '35%', height: '35%' },
  { top: '49%', left: '60%', width: '37%', height: '36%' },
];

interface PanelDreamProps {
  images: DreamImage[];
}

function DreamMask({ image, index }: { image: DreamImage; index: number }) {
  const maskPathRef = useRef<SVGPathElement | null>(null);

  const glowPathRef = useRef<SVGPathElement | null>(null);

  const points = useMemo(() => {
    const total = 22;

    return Array.from({ length: total }, (_, i) => {
      const angle = (Math.PI * 2 * i) / total;

      return {
        angle,

        radius: 235 + Math.sin(angle * 2) * 24 + Math.cos(angle * 3) * 18,

        seedA: Math.random() * 1000,
        seedB: Math.random() * 1000,
        seedC: Math.random() * 1000,
      };
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    let raf = 0;

    const animate = () => {
      // Velocity
      frame += 0.005;

      const dynamicPoints = points.map((point, i) => {
        const waveA = Math.sin(frame * 1.1 + point.seedA + i * 0.25) * 15;

        const waveB = Math.cos(frame * 1.7 + point.seedB) * 14;

        const waveC = Math.sin(frame * 0.8 + point.seedC + i * 0.9) * 10;

        const waveD = Math.cos(frame * 2.2 + point.seedA * 0.5) * 8;

        const localDistortion = Math.sin(frame + i * 1.8) * 6;

        const dreamScale = 1.12;

        const radius =
          (point.radius + waveA + waveB + waveC + waveD + localDistortion) * dreamScale;

        const x = 341.5 + Math.cos(point.angle) * radius;

        const y = 229.5 + Math.sin(point.angle) * (radius * 0.72);

        return { x, y };
      });

      let d = `
        M ${dynamicPoints[0].x}
        ${dynamicPoints[0].y}
      `;

      for (let i = 0; i < dynamicPoints.length; i++) {
        const current = dynamicPoints[i];

        const next = dynamicPoints[(i + 1) % dynamicPoints.length];

        const cx = (current.x + next.x) / 2;

        const cy = (current.y + next.y) / 2;

        d += `
          Q ${current.x} ${current.y}
          ${cx} ${cy}
        `;
      }

      d += ' Z';

      if (maskPathRef.current) {
        maskPathRef.current.setAttribute('d', d);
      }

      if (glowPathRef.current) {
        glowPathRef.current.setAttribute('d', d);
      }

      raf = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(raf);
  }, [points]);

  const maskId = `dream-mask-${index}`;
  const blurId = `dream-blur-${index}`;
  const glowId = `dream-glow-${index}`;

  return (
    <svg
      className="absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 683 459"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Soft edge blur */}
        <filter id={blurId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        {/* Atmospheric dream glow */}
        <filter id={glowId} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="42" result="blur" />

          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 1
              0 1 0 0 1
              0 0 1 0 1
              0 0 0 0.9 0
            "
          />
        </filter>

        <mask id={maskId}>
          <rect width="100%" height="100%" fill="black" />

          <path ref={maskPathRef} fill="white" filter={`url(#${blurId})`} />
        </mask>
      </defs>

      <path ref={glowPathRef} fill="white" opacity="0.55" filter={`url(#${glowId})`} />

      <foreignObject width="100%" height="100%" mask={`url(#${maskId})`}>
        <div className="relative h-full w-full">
          <Image
            src={image.src}
            alt={image.tag}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 85vw, 35vw"
            className="scale-[1.04] object-cover"
          />

          {/* Large dream diffusion */}
          <div className="absolute inset-0 bg-white/10 opacity-50 mix-blend-screen backdrop-blur-[22px]" />

          {/* Secondary atmospheric layer */}
          <div className="absolute inset-[10%] rounded-full bg-white/10 opacity-80 blur-[120px]" />

          {/* Dream haze */}
          <div className="absolute inset-[-6%] rounded-full bg-white/8 opacity-70 blur-[140px]" />
        </div>
      </foreignObject>
    </svg>
  );
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

          return (
            <div
              key={`${index}-${image.src}`}
              style={positionVars}
              className="relative mx-auto h-64 w-[85%] shrink-0 overflow-visible md:absolute md:top-[var(--dream-top)] md:left-[var(--dream-left)] md:mx-0 md:h-[var(--dream-height)] md:w-[var(--dream-width)]"
            >
              {/* Ambient atmospheric fog */}
              <div className="pointer-events-none absolute inset-[-18%] z-0 rounded-full bg-white/25 opacity-90 blur-[120px]" />

              {/* Animated dream mask */}
              <div className="absolute inset-0 z-10">
                <DreamMask image={image} index={index} />
              </div>

              {/* Floating tag */}
              <span className="bg-beige-900/85 absolute bottom-[28%] left-[24%] z-20 rounded-full px-3 py-1 text-xs text-white backdrop-blur-md">
                {image.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
