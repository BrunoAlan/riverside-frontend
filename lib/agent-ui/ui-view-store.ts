import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { UiCommand } from './commands';
import type { UiHint, UiSource, UiView } from './ui-view-types';

interface UiViewState {
  view: UiView;
  hint: UiHint | null;
  source: UiSource;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
}

const INITIAL_VIEW: UiView = { type: 'discovery_canvas' };

export function createUiViewStore() {
  return createStore<UiViewState>()((set) => ({
    view: INITIAL_VIEW,
    hint: null,
    source: 'initial',
    lastCorrelationId: null,
    lastError: null,

    applyCommand: (cmd) =>
      set(() => {
        switch (cmd.type) {
          case 'show_discovery_canvas':
            return {
              view: { type: 'discovery_canvas' },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'show_itinerary_options':
            return {
              view: { type: 'itinerary_options', options: cmd.payload.options },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'soft_redirect':
            return {
              hint: {
                type: 'soft_redirect',
                reasonCode: cmd.payload.reason_code,
                missing: cmd.payload.missing,
              },
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
        }
      }),

    setViewFromDev: (view) => set({ view, hint: null, source: 'dev', lastCorrelationId: null }),

    recordParseError: (err) => set({ lastError: err }),
  }));
}

// Singleton used by the running app.
export const uiViewStore = createUiViewStore();

// React hook over the singleton.
export function useUiViewStore<T>(selector: (s: UiViewState) => T): T {
  return useStore(uiViewStore, selector);
}
