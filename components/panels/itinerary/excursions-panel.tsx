'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { Card } from '@/components/ui/card';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Experience, ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { buildExperienceDayOptions } from '@/lib/map/build-experience-day-options';

const CARD_WIDTH = 380;

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
};

export function ExcursionsPanel({ itinerary }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const sendIntent = useFrontendIntent();
  const cities = itinerary?.cities ?? [];
  const experiences = cities.flatMap((city) => city.experiences ?? []);
  const dayOptionsByExperience = buildExperienceDayOptions(cities);

  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  const handleExperienceConfirm = useCallback(
    (experience: Experience, day: string) => {
      void sendIntent('select_experience', {
        entities: { experience_id: experience.id, day },
        userMessage: `User added ${experience.name} for ${day}`,
      });
    },
    [sendIntent]
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 p-6">
      <CruiseHeroCard />
      <CityExperiencesPanel
        experiences={experiences}
        detailExperienceId={null}
        getDayOptions={(experience) => dayOptionsByExperience.get(experience.id) ?? []}
        addedExperiences={addedExperiences}
        onExplore={handleExperienceExplore}
        onConfirm={handleExperienceConfirm}
      />
    </div>
  );
}

function CruiseHeroCard() {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-full flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
      style={{ width: CARD_WIDTH }}
    >
      <div className="relative h-[200px] w-full shrink-0">
        <Image
          src="/hero-image.jpg"
          alt="Riverside cruise along the Danube"
          fill
          sizes="356px"
          className="rounded-lg object-cover"
        />
      </div>
      <div className="mt-4 flex flex-col gap-4 px-2 pb-2">
        <div>
          <p className="text-2xl leading-tight">Danube Legends</p>
          <p className="text-primary mt-1 text-sm leading-relaxed">
            Explore Riverside luxury along the Danube, visiting Budapest, Bratislava and Vienna.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Time spent
          </p>
          <p className="text-primary mt-1 text-sm">Mostly on board</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Perfect for
          </p>
          <p className="text-primary mt-1 text-sm">Romantic getaways</p>
        </div>
      </div>
    </Card>
  );
}
