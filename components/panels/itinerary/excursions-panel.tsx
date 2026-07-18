'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExcursionCard } from '@/components/panels/itinerary/excursion-card';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import type { Experience, ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { buildExcursionItems } from '@/lib/map/build-excursion-items';

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
  detailExperienceId: string | undefined;
};

export function ExcursionsPanel({ itinerary, detailExperienceId }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const sendIntent = useFrontendIntent();
  const items = buildExcursionItems(itinerary?.cities ?? []);

  // Only one detail dialog is open at a time, and the backend's
  // show_experience_detail command must be able to drive it, so the open id lives
  // here rather than inside each card.
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade } = useScrollFade(scrollRef, [items.length]);

  // Authoritative over local state so the backend can also close the dialog
  // (detailExperienceId becomes undefined). Note: if the backend re-sends the
  // same id after the user closed it locally, the prop doesn't change and this
  // effect won't re-run, so the dialog stays shut — fixing that needs a nonce
  // alongside detailExperienceId in the store, which is out of scope here.
  useEffect(() => {
    setOpenDetailId(detailExperienceId ?? null);
  }, [detailExperienceId]);

  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  // Closing the detail has to be reported too, or the agent keeps believing the
  // modal is still open. The backend's view_experience_selection handler is the
  // counterpart to explore_experience and answers with show_experience_detail:null.
  const handleExperienceCloseDetail = useCallback(
    (experience: Experience) => {
      void sendIntent('view_experience_selection', {
        userMessage: `User closed ${experience.name} detail`,
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
    // pt-20 clears the tab pill bar, which ItineraryPanel floats at top-6 with a
    // ~44px height — cards would otherwise slide under it as the grid scrolls.
    <div className="pointer-events-none absolute inset-0 px-6 pt-20 pb-6">
      <div
        className={`pointer-events-none absolute top-20 right-0 left-0 z-1 h-[60px] bg-gradient-to-b from-[#E7DCD3] transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'} `}
      />
      <div
        className="scrollbar-hide flex h-full flex-wrap content-start items-start gap-3 overflow-y-auto"
        ref={scrollRef}
      >
        {items.map(({ experience, dayOptions }) => (
          <ExcursionCard
            key={experience.id}
            experience={experience}
            dayOptions={dayOptions}
            addedDays={addedExperiences
              .filter((e) => e.experienceId === experience.id)
              .map((e) => e.day)}
            detailOpen={openDetailId === experience.id}
            onDetailOpenChange={(open) => {
              setOpenDetailId(open ? experience.id : null);
              if (open) handleExperienceExplore(experience);
              else handleExperienceCloseDetail(experience);
            }}
            onConfirm={(day) => handleExperienceConfirm(experience, day)}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute right-0 bottom-0 left-0 z-1 h-[60px] bg-gradient-to-t from-[#EDE6DD] transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
      />
    </div>
  );
}
