import { useUiViewStore } from './ui-view-store';

export const useUiView = () => useUiViewStore((s) => s.view);
export const useUiHint = () => useUiViewStore((s) => s.hint);
export const useUiSource = () => useUiViewStore((s) => s.source);
export const useUiLastError = () => useUiViewStore((s) => s.lastError);
export const useSetViewFromDev = () => useUiViewStore((s) => s.setViewFromDev);
export const useSetViewFromUser = () => useUiViewStore((s) => s.setViewFromUser);
export const useSetItineraryTabFromUser = () => useUiViewStore((s) => s.setItineraryTabFromUser);
export const useBookingSummary = () => useUiViewStore((s) => s.bookingSummary);
/**
 * The booking summary only when it is actually rendered: the `start` view never
 * shows the card, whatever the store holds. Returns `null` when no card is on
 * screen, so callers that lay out around the card share one condition with it.
 */
export const useVisibleBookingSummary = () =>
  useUiViewStore((s) => (s.view.type === 'start' ? null : s.bookingSummary));
export const useSetBookingSummaryFromDev = () => useUiViewStore((s) => s.setBookingSummaryFromDev);
export const useSelectedCabinId = () => useUiViewStore((s) => s.selectedCabinId);
export const useAddedExperiences = () => useUiViewStore((s) => s.addedExperiences);
export const useApplyCommand = () => useUiViewStore((s) => s.applyCommand);
export const useClearAddedExperiencesFromDev = () =>
  useUiViewStore((s) => s.clearAddedExperiencesFromDev);
export const useItinerarySummary = () => useUiViewStore((s) => s.itinerarySummary);
export const useCloseItinerarySummary = () => useUiViewStore((s) => s.closeItinerarySummary);
export const useSetItinerarySummaryFromDev = () =>
  useUiViewStore((s) => s.setItinerarySummaryFromDev);
export const useBookingForm = () => useUiViewStore((s) => s.bookingForm);
export const useSetBookingFormFromDev = () => useUiViewStore((s) => s.setBookingFormFromDev);
export const useCloseBookingForm = () => useUiViewStore((s) => s.closeBookingForm);
export const useAgentSuggestions = () => useUiViewStore((s) => s.agentSuggestions);
export const useSetAgentSuggestionsFromDev = () =>
  useUiViewStore((s) => s.setAgentSuggestionsFromDev);
