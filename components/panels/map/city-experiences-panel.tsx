'use client';

import { useEffect, useRef, useState } from 'react';
import { ExperienceCard } from '@/components/panels/map/experience-card';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 440;

type CityExperiencesPanelProps = {
  experiences: Experience[];
};

export function CityExperiencesPanel({ experiences }: CityExperiencesPanelProps) {
  const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateFadeState = () => {
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setShowTopFade(!atTop);
      setShowBottomFade(!atBottom);
    };

    updateFadeState();
    el.addEventListener('scroll', updateFadeState);

    const observer = new ResizeObserver(updateFadeState);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateFadeState);
      observer.disconnect();
    };
  }, [experiences]);

  return (
    <div
      className="pointer-events-auto relative flex h-full flex-col gap-3 pt-10"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="text-muted-foreground shrink-0 px-2 text-sm font-bold tracking-wide uppercase">
        Experiences
      </div>
      <div
        className={`pointer-events-none absolute top-[60px] right-0 left-0 z-1 h-[60px] bg-gradient-to-b from-[#E7DCD3] transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'} `}
      />
      <div
        className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2"
        ref={scrollRef}
      >
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            expanded={experience.id === openId}
            onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute right-0 bottom-0 left-0 z-1 h-[60px] bg-gradient-to-t from-[#EDE6DD] transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
      />
    </div>
  );
}
