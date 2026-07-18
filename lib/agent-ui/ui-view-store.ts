import { useStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import type { BookingForm } from '@/lib/booking-form/types';
import { toItinerarySummary } from '@/lib/itinerary-summary/from-wire';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';
import type { UiCommand } from './commands';
import type { BookingSummary, ItineraryTab, UiHint, UiSource, UiView } from './ui-view-types';

interface UiViewState {
  view: UiView;
  hint: UiHint | null;
  source: UiSource;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;
  bookingSummary: BookingSummary | null;
  selectedCabinId: string | null;
  addedExperiences: Array<{ experienceId: string; day: string }>;
  itinerarySummary: ItinerarySummary | null;
  bookingForm: BookingForm | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  setViewFromUser: (view: UiView) => void;
  setItineraryTabFromUser: (tab: ItineraryTab) => void;
  setBookingSummaryFromDev: (summary: BookingSummary | null) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
  clearAddedExperiencesFromDev: () => void;
  setItinerarySummaryFromDev: (summary: ItinerarySummary | null) => void;
  closeItinerarySummary: () => void;
  setBookingFormFromDev: (form: BookingForm | null) => void;
  closeBookingForm: () => void;
}

const INITIAL_VIEW: UiView = { type: 'start' };

const DEVTOOLS_ENABLED = process.env.NODE_ENV !== 'production';

export function createUiViewStore() {
  return createStore<UiViewState>()(
    devtools(
      (set) => ({
        view: INITIAL_VIEW,
        hint: null,
        source: 'initial',
        lastCorrelationId: null,
        lastError: null,
        bookingSummary: null,
        selectedCabinId: null,
        addedExperiences: [],
        itinerarySummary: null,
        bookingForm: null,

        applyCommand: (cmd) =>
          set(
            (state) => {
              switch (cmd.type) {
                case 'show_discovery_canvas':
                  return {
                    view: { type: 'presentation' },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'show_itinerary_options':
                  return {
                    // Replaces the whole view, so activeTab resets to undefined
                    // (Overview). Deliberate: a newly delivered itinerary should
                    // always start on Overview.
                    view: { type: 'itinerary', itinerary: cmd.payload.itinerary },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'show_destination_detail':
                  return {
                    view: {
                      type: 'dream_stage',
                      destination: cmd.payload.destination,
                      images: cmd.payload.images,
                    },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'soft_redirect':
                  return {
                    hint: {
                      type: 'soft_redirect',
                      reasonCode: cmd.payload.reason_code,
                      missing: cmd.payload.missing,
                    },
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'set_booking_summary':
                  return {
                    bookingSummary: cmd.payload,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'show_cabin_options':
                  return {
                    view: { type: 'cabin_selection', cabins: cmd.payload.cabins },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'show_cabin_detail': {
                  if (state.view.type !== 'cabin_selection') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  return {
                    view: { ...state.view, detailCabinId: cmd.payload.cabin_id ?? undefined },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'show_city_detail': {
                  if (state.view.type !== 'itinerary') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  return {
                    view: { ...state.view, detailCityId: cmd.payload.city_id ?? undefined },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'show_experience_detail': {
                  if (state.view.type !== 'itinerary') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  const experienceId = cmd.payload.experience_id ?? undefined;
                  return {
                    view: {
                      ...state.view,
                      detailExperienceId: experienceId,
                      // Opening a detail forces the tab that can show it, so the
                      // agent needs one command instead of an ordered pair — but
                      // only when no city detail is open on the map: that surface
                      // already renders the experience via CityExperiencesPanel,
                      // so forcing the tab there would yank the user off the map.
                      // Closing leaves the tab where the user left it.
                      activeTab:
                        experienceId && !state.view.detailCityId
                          ? 'excursions'
                          : state.view.activeTab,
                    },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'show_itinerary_tab': {
                  if (state.view.type !== 'itinerary') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  return {
                    view: { ...state.view, activeTab: cmd.payload.tab },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'add_cabin_to_basket':
                  return {
                    selectedCabinId: cmd.payload.cabin_id,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'add_experience_to_basket': {
                  const { experience_id, day } = cmd.payload;
                  const exists = state.addedExperiences.some(
                    (e) => e.experienceId === experience_id && e.day === day
                  );
                  return {
                    addedExperiences: exists
                      ? state.addedExperiences
                      : [...state.addedExperiences, { experienceId: experience_id, day }],
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'sync_itinerary_experiences': {
                  const next = [...state.addedExperiences];
                  for (const e of cmd.payload.experiences) {
                    const exists = next.some(
                      (a) => a.experienceId === e.experience_id && a.day === e.day
                    );
                    if (!exists) next.push({ experienceId: e.experience_id, day: e.day });
                  }
                  return {
                    addedExperiences: next,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'show_itinerary_summary':
                  return {
                    itinerarySummary: toItinerarySummary(cmd.payload),
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                default: {
                  const _exhaustive: never = cmd;
                  void _exhaustive;
                  return {};
                }
              }
            },
            false,
            `applyCommand/${cmd.type}`
          ),

        setViewFromDev: (view) =>
          set(
            { view, hint: null, source: 'dev', lastCorrelationId: null },
            false,
            'setViewFromDev'
          ),

        setViewFromUser: (view) =>
          set(
            { view, hint: null, source: 'user', lastCorrelationId: null },
            false,
            'setViewFromUser'
          ),

        setItineraryTabFromUser: (tab) =>
          set(
            (state) =>
              state.view.type === 'itinerary'
                ? {
                    view: { ...state.view, activeTab: tab },
                    hint: null,
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'setItineraryTabFromUser'
          ),

        setBookingSummaryFromDev: (summary) =>
          set(
            { bookingSummary: summary, source: 'dev', lastCorrelationId: null },
            false,
            'setBookingSummaryFromDev'
          ),

        recordParseError: (err) => set({ lastError: err }, false, 'recordParseError'),

        clearAddedExperiencesFromDev: () =>
          set(
            { addedExperiences: [], source: 'dev', lastCorrelationId: null },
            false,
            'clearAddedExperiencesFromDev'
          ),

        setItinerarySummaryFromDev: (summary) =>
          set(
            { itinerarySummary: summary, source: 'dev', lastCorrelationId: null },
            false,
            'setItinerarySummaryFromDev'
          ),

        closeItinerarySummary: () =>
          set(
            { itinerarySummary: null, source: 'user', lastCorrelationId: null },
            false,
            'closeItinerarySummary'
          ),

        setBookingFormFromDev: (form) =>
          set(
            { bookingForm: form, source: 'dev', lastCorrelationId: null },
            false,
            'setBookingFormFromDev'
          ),

        closeBookingForm: () =>
          set(
            { bookingForm: null, source: 'user', lastCorrelationId: null },
            false,
            'closeBookingForm'
          ),
      }),
      { name: 'ui-view-store', enabled: DEVTOOLS_ENABLED }
    )
  );
}

// Singleton used by the running app.
export const uiViewStore = createUiViewStore();

// React hook over the singleton.
export function useUiViewStore<T>(selector: (s: UiViewState) => T): T {
  return useStore(uiViewStore, selector);
}
