import { useStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { COUNTRY_CODES, type GuestInfo, makeBookingForm } from '@/lib/booking-form/guests';
import type { BookingForm } from '@/lib/booking-form/types';
import { toItinerarySummary } from '@/lib/itinerary-summary/from-wire';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';
import type { SuggestionPill } from '@/lib/suggestions/pills';
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
  // Backend-driven pill override. `null` = no override, the static catalog
  // renders. `key` identifies the delivery (correlationId, or 'dev') so the
  // container can reset its dismissed state when fresh pills arrive.
  agentSuggestions: { pills: SuggestionPill[]; key: string } | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  setViewFromUser: (view: UiView) => void;
  setItineraryTabFromUser: (tab: ItineraryTab) => void;
  setBookingSummaryFromDev: (summary: BookingSummary | null) => void;
  setAgentSuggestionsFromDev: (pills: SuggestionPill[] | null) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
  clearAddedExperiencesFromDev: () => void;
  setItinerarySummaryFromDev: (summary: ItinerarySummary | null) => void;
  closeItinerarySummary: () => void;
  setBookingFormFromDev: (form: BookingForm | null) => void;
  closeBookingForm: () => void;
  updateGuestFromUser: (index: number, patch: Partial<GuestInfo>) => void;
  setAgreedFromUser: (agreed: boolean) => void;
  submitBookingFormFromUser: () => void;
}

const INITIAL_VIEW: UiView = { type: 'start' };

// True when the open city detail on the map is already rendering this experience,
// i.e. CityExperiencesPanel has it in its list. Used to decide whether an
// agent-sent experience detail needs to pull the user to the Excursions tab.
function isExperienceOnMap(
  view: Extract<UiView, { type: 'itinerary' }>,
  experienceId: string
): boolean {
  if (!view.detailCityId) return false;
  const openCity = view.itinerary?.cities.find((city) => city.id === view.detailCityId);
  return openCity?.experiences?.some((experience) => experience.id === experienceId) ?? false;
}

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
        agentSuggestions: null,

        applyCommand: (cmd) =>
          set(
            (state) => {
              switch (cmd.type) {
                case 'show_discovery_canvas':
                  return {
                    view: { type: 'presentation' },
                    hint: null,
                    agentSuggestions: null,
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
                    agentSuggestions: null,
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
                    agentSuggestions: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'soft_redirect':
                  return {
                    hint: {
                      type: 'soft_redirect',
                      reasonCode: cmd.payload.reasonCode,
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
                    agentSuggestions: null,
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
                      // agent needs one command instead of an ordered pair.
                      //
                      // The exception is when the map is ALREADY showing this
                      // experience: an open city detail renders its own
                      // experiences via CityExperiencesPanel, and expanding one
                      // there round-trips through the agent as
                      // explore_experience → show_experience_detail. Switching
                      // tabs then would yank the user off the map by their own
                      // click. Note this is scoped to the specific experience —
                      // an experience from a different city is not on screen, so
                      // it still needs the tab. Closing leaves the tab alone.
                      activeTab:
                        experienceId && !isExperienceOnMap(state.view, experienceId)
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
                    view: {
                      ...state.view,
                      activeTab: cmd.payload.tab,
                      // Leaving Overview collapses any open city detail, matching
                      // what a user tap on the tab does (itinerary-panel.tsx).
                      // Without this the same transition would leave different
                      // state depending on who triggered it, and the card would
                      // still be open when the user came back.
                      detailCityId:
                        cmd.payload.tab === 'excursions' ? undefined : state.view.detailCityId,
                    },
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
                  // Without a day there is nothing to key the card badge on;
                  // the sync command in the same batch is the source of truth.
                  if (!day) {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
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
                case 'show_suggestions': {
                  const { suggestions } = cmd.payload;
                  return {
                    // An empty list clears the override; static pills return.
                    agentSuggestions: suggestions.length
                      ? {
                          pills: suggestions.map((s) => ({
                            id: s.id,
                            label: s.label ?? s.text,
                            message: s.text,
                          })),
                          key: cmd.correlationId,
                        }
                      : null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'show_booking_form':
                  return {
                    bookingForm: makeBookingForm(
                      toItinerarySummary(cmd.payload.summary),
                      cmd.payload.guest_count
                    ),
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                case 'update_booking_form': {
                  if (!state.bookingForm) {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  const guests = [...state.bookingForm.guests];
                  for (const patch of cmd.payload.guests) {
                    const current = guests[patch.index];
                    // Out-of-range indices are ignored, not an error.
                    if (!current) continue;
                    guests[patch.index] = {
                      firstName: patch.first_name ?? current.firstName,
                      lastName: patch.last_name ?? current.lastName,
                      email: patch.email ?? current.email,
                      // Only codes the phone select can render.
                      countryCode: (COUNTRY_CODES as readonly string[]).includes(
                        patch.country_code ?? ''
                      )
                        ? (patch.country_code as string)
                        : current.countryCode,
                      phone: patch.phone ?? current.phone,
                    };
                  }
                  // `agreed` is never touched here: consent is user-only.
                  return {
                    bookingForm: { ...state.bookingForm, guests },
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
                case 'close_booking_form':
                  return {
                    bookingForm: null,
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
            (state) => ({
              view,
              hint: null,
              source: 'dev',
              lastCorrelationId: null,
              // Backend pills are scoped to the view they arrived on.
              agentSuggestions: state.view.type === view.type ? state.agentSuggestions : null,
            }),
            false,
            'setViewFromDev'
          ),

        setViewFromUser: (view) =>
          set(
            (state) => ({
              view,
              hint: null,
              source: 'user',
              lastCorrelationId: null,
              agentSuggestions: state.view.type === view.type ? state.agentSuggestions : null,
            }),
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

        setAgentSuggestionsFromDev: (pills) =>
          set(
            {
              agentSuggestions: pills ? { pills, key: 'dev' } : null,
              source: 'dev',
              lastCorrelationId: null,
            },
            false,
            'setAgentSuggestionsFromDev'
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

        updateGuestFromUser: (index, patch) =>
          set(
            (state) =>
              state.bookingForm?.guests[index]
                ? {
                    bookingForm: {
                      ...state.bookingForm,
                      guests: state.bookingForm.guests.map((g, i) =>
                        i === index ? { ...g, ...patch } : g
                      ),
                    },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'updateGuestFromUser'
          ),

        setAgreedFromUser: (agreed) =>
          set(
            (state) =>
              state.bookingForm
                ? {
                    bookingForm: { ...state.bookingForm, agreed },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'setAgreedFromUser'
          ),

        submitBookingFormFromUser: () =>
          set(
            (state) =>
              state.bookingForm
                ? {
                    bookingForm: { ...state.bookingForm, status: 'submitting' },
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'submitBookingFormFromUser'
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
