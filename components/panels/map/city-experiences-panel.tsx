'use client';

import { useEffect, useRef, useState } from 'react';
import { ExperienceCard } from '@/components/panels/map/experience-card';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 440;

type CityExperiencesPanelProps = {
  experiences: Experience[];
  detailExperienceId: string | null;
  dayOptions: string[];
  addedExperiences: Array<{ experienceId: string; day: string }>;
  onExplore: (experience: Experience) => void;
  onConfirm: (experience: Experience, day: string) => void;
};

export function CityExperiencesPanel({
  experiences,
  detailExperienceId,
  dayOptions,
  addedExperiences,
  onExplore,
  onConfirm,
}: CityExperiencesPanelProps) {
  // Local open state with a first-card default; a show_experience_detail command
  // from the backend overrides it via the effect below.
  const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade } = useScrollFade(scrollRef, [experiences]);

  useEffect(() => {
    if (detailExperienceId) {
      setOpenId(detailExperienceId);
    }
  }, [detailExperienceId]);

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
            onToggle={() => {
              const willOpen = openId !== experience.id;
              setOpenId(willOpen ? experience.id : null);
              if (willOpen) onExplore(experience);
            }}
            dayOptions={dayOptions}
            addedDays={addedExperiences
              .filter((e) => e.experienceId === experience.id)
              .map((e) => e.day)}
            onConfirm={(day) => onConfirm(experience, day)}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute right-0 bottom-0 left-0 z-1 h-[60px] bg-gradient-to-t from-[#EDE6DD] transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
      />
    </div>
  );
}
