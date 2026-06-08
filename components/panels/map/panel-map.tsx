'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Experience } from '@/lib/agent-ui/commands';
import { useAddedExperiences, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';
import { parseCityDays } from '@/lib/map/parse-city-days';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

type PanelMapProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function PanelMap({ view }: PanelMapProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const addedExperiences = useAddedExperiences();

  const { itinerary, detailCityId, detailExperienceId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  // `days` is the full day list (e.g. "Days 1, 2, 6 & 7"); `day_details` only
  // carries descriptions for some of them, so it's not the source of options.
  const dayOptions = detailCity ? parseCityDays(detailCity.days) : [];

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary]);

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
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
        showRoute
      />
      {detailCity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
          <CityDetailCard city={detailCity} onClose={handleClose} />
          {detailCity.experiences && detailCity.experiences.length > 0 && (
            <CityExperiencesPanel
              experiences={detailCity.experiences}
              detailExperienceId={detailExperienceId ?? null}
              dayOptions={dayOptions}
              addedExperiences={addedExperiences}
              onExplore={handleExperienceExplore}
              onConfirm={handleExperienceConfirm}
            />
          )}
        </div>
      )}
    </div>
  );
}
