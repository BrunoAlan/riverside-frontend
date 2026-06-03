import { ExperienceCard } from '@/components/panels/map/experience-card';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 380;

type CityExperiencesPanelProps = {
  experiences: Experience[];
};

export function CityExperiencesPanel({ experiences }: CityExperiencesPanelProps) {
  return (
    <div
      className="pointer-events-auto flex max-h-[85vh] flex-col gap-3 overflow-y-auto pr-1"
      style={{ width: PANEL_WIDTH }}
    >
      <p className="text-muted-foreground px-2 text-xs tracking-wide uppercase">Experiences</p>
      {experiences.map((experience, index) => (
        <ExperienceCard key={experience.id} experience={experience} defaultExpanded={index === 0} />
      ))}
    </div>
  );
}
