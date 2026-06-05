import { describe, expect, it } from 'vitest';
import { createEventLogStore } from './event-log-store';

describe('event-log-store', () => {
  it('appends events and assigns incrementing seq and id', () => {
    const store = createEventLogStore();
    store.getState().record({ ts: 1, channel: 'ui-commands', label: 'a', ok: true, payload: {} });
    store
      .getState()
      .record({ ts: 2, channel: 'frontend-intent', label: 'b', ok: true, payload: {} });
    const { events } = store.getState();
    expect(events.map((e) => e.seq)).toEqual([0, 1]);
    expect(events.map((e) => e.id)).toEqual(['0', '1']);
    expect(events.map((e) => e.label)).toEqual(['a', 'b']);
  });

  it('keeps seq monotonic across the cap and drops the oldest', () => {
    const store = createEventLogStore();
    for (let i = 0; i < 205; i++) {
      store
        .getState()
        .record({ ts: i, channel: 'ui-commands', label: `e${i}`, ok: true, payload: {} });
    }
    const { events } = store.getState();
    expect(events).toHaveLength(200);
    expect(events[0].label).toBe('e5'); // first 5 dropped
    expect(events[events.length - 1].seq).toBe(204);
  });

  it('clear empties the events but keeps seq monotonic', () => {
    const store = createEventLogStore();
    store.getState().record({ ts: 1, channel: 'ui-commands', label: 'a', ok: true, payload: {} });
    store.getState().clear();
    expect(store.getState().events).toEqual([]);
    store.getState().record({ ts: 2, channel: 'ui-commands', label: 'b', ok: true, payload: {} });
    expect(store.getState().events[0].seq).toBe(1);
  });
});
