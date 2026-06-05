import { useStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

interface VoiceState {
  voiceId: string | null;
  setVoiceId: (id: string) => void;
}

const DEVTOOLS_ENABLED = process.env.NODE_ENV !== 'production';

export function createVoiceStore() {
  return createStore<VoiceState>()(
    devtools(
      (set) => ({
        voiceId: null,
        setVoiceId: (id) => set({ voiceId: id }, false, 'setVoiceId'),
      }),
      { name: 'voice-store', enabled: DEVTOOLS_ENABLED }
    )
  );
}

// Singleton used by the running app.
export const voiceStore = createVoiceStore();

// React hook over the singleton.
export function useVoiceStore<T>(selector: (s: VoiceState) => T): T {
  return useStore(voiceStore, selector);
}
