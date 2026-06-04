import { useUiViewStore } from './ui-view-store';

export const useUiView = () => useUiViewStore((s) => s.view);
export const useUiHint = () => useUiViewStore((s) => s.hint);
export const useUiSource = () => useUiViewStore((s) => s.source);
export const useUiLastError = () => useUiViewStore((s) => s.lastError);
export const useSetViewFromDev = () => useUiViewStore((s) => s.setViewFromDev);
export const useSetViewFromUser = () => useUiViewStore((s) => s.setViewFromUser);
export const useBookingSummary = () => useUiViewStore((s) => s.bookingSummary);
export const useSetBookingSummaryFromDev = () => useUiViewStore((s) => s.setBookingSummaryFromDev);
export const useSelectedCabinId = () => useUiViewStore((s) => s.selectedCabinId);
export const useAddedExperiences = () => useUiViewStore((s) => s.addedExperiences);
