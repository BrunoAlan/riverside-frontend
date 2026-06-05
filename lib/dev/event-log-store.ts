'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type DevEvent = {
  id: string;
  seq: number;
  ts: number;
  channel: 'ui-commands' | 'frontend-intent';
  label: string;
  correlationId?: string;
  ok: boolean;
  payload: unknown;
  envelope?: unknown;
};

export type DevEventInput = Omit<DevEvent, 'id' | 'seq'>;

const CAP = 200;

interface EventLogState {
  events: DevEvent[];
  nextSeq: number;
  record: (input: DevEventInput) => void;
  clear: () => void;
}

export function createEventLogStore() {
  return createStore<EventLogState>()((set) => ({
    events: [],
    nextSeq: 0,
    record: (input) =>
      set((s) => {
        const seq = s.nextSeq;
        const event: DevEvent = { ...input, seq, id: String(seq) };
        const next = [...s.events, event];
        return {
          events: next.length > CAP ? next.slice(next.length - CAP) : next,
          nextSeq: seq + 1,
        };
      }),
    clear: () => set({ events: [] }),
  }));
}

// Singleton used by the running app.
export const eventLogStore = createEventLogStore();

function useEventLogStore<T>(selector: (s: EventLogState) => T): T {
  return useStore(eventLogStore, selector);
}

export const useDevEventLog = () => useEventLogStore((s) => s.events);
export const useClearDevEventLog = () => useEventLogStore((s) => s.clear);
