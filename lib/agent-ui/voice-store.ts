import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

interface VoiceState {
  voiceId: string | null;
  setVoiceId: (id: string) => void;
}

export function createVoiceStore() {
  return createStore<VoiceState>()((set) => ({
    voiceId: null,
    setVoiceId: (id) => set({ voiceId: id }),
  }));
}

// Singleton used by the running app.
export const voiceStore = createVoiceStore();

// React hook over the singleton.
export function useVoiceStore<T>(selector: (s: VoiceState) => T): T {
  return useStore(voiceStore, selector);
}
