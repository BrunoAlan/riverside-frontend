import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { UiCommand } from './commands';
import type { AddOnDecision, BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';

interface UiViewState {
  view: UiView;
  hint: UiHint | null;
  source: UiSource;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;
  bookingSummary: BookingSummary | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  setViewFromUser: (view: UiView) => void;
  setBookingSummaryFromDev: (summary: BookingSummary | null) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
  setAddOnDecision: (addOnId: string, decision: AddOnDecision) => void;
}

const INITIAL_VIEW: UiView = { type: 'start' };

export function createUiViewStore() {
  return createStore<UiViewState>()((set) => ({
    view: INITIAL_VIEW,
    hint: null,
    source: 'initial',
    lastCorrelationId: null,
    lastError: null,
    bookingSummary: null,

    applyCommand: (cmd) =>
      set(() => {
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
              view: { type: 'itinerary', itinerary: cmd.payload.itinerary, addOnDecisions: {} },
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
          case 'set_cabin_detail':
            return {
              view: {
                type: 'cabin_selection',
                detailCabinId: cmd.payload.cabin_id ?? undefined,
              },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlationId,
            };
          default: {
            const _exhaustive: never = cmd;
            void _exhaustive;
            return {};
          }
        }
      }),

    setViewFromDev: (view) => set({ view, hint: null, source: 'dev', lastCorrelationId: null }),

    setViewFromUser: (view) => set({ view, hint: null, source: 'user', lastCorrelationId: null }),

    setBookingSummaryFromDev: (summary) =>
      set({ bookingSummary: summary, source: 'dev', lastCorrelationId: null }),

    recordParseError: (err) => set({ lastError: err }),

    setAddOnDecision: (addOnId, decision) =>
      set((state) => {
        if (state.view.type !== 'itinerary') return {};
        return {
          view: {
            type: 'itinerary',
            itinerary: state.view.itinerary,
            addOnDecisions: { ...state.view.addOnDecisions, [addOnId]: decision },
          },
          source: 'user',
        };
      }),
  }));
}

// Singleton used by the running app.
export const uiViewStore = createUiViewStore();

// React hook over the singleton.
export function useUiViewStore<T>(selector: (s: UiViewState) => T): T {
  return useStore(uiViewStore, selector);
}
