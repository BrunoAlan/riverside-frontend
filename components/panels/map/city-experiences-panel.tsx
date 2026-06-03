'use client';

import { useState } from 'react';
import { ExperienceCard } from '@/components/panels/map/experience-card';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 440;

type CityExperiencesPanelProps = {
  experiences: Experience[];
};

export function CityExperiencesPanel({ experiences }: CityExperiencesPanelProps) {
  const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null);

  return (
    <div
      className="pointer-events-auto flex max-h-full flex-col gap-3"
      style={{ width: PANEL_WIDTH }}
    >
      <p className="text-muted-foreground shrink-0 px-2 text-xs tracking-wide uppercase">
        Experiences
      </p>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            expanded={experience.id === openId}
            onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
          />
        ))}
      </div>
    </div>
  );
}
