import { type DevEventInput, eventLogStore } from './event-log-store';

// Always safe to call. No-ops in production so prod code never reaches the
// dev store — mirrors the analytics `captureEvent` wrapper.
export function recordDevEvent(input: Omit<DevEventInput, 'ts'>): void {
  if (process.env.NODE_ENV === 'production') return;
  eventLogStore.getState().record({ ...input, ts: Date.now() });
}
