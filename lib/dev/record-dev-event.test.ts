import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventLogStore } from './event-log-store';
import { recordDevEvent } from './record-dev-event';

afterEach(() => {
  vi.unstubAllEnvs();
  eventLogStore.getState().clear();
});

describe('recordDevEvent', () => {
  it('records an event with a stamped ts in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    recordDevEvent({
      channel: 'frontend-intent',
      label: 'view_itinerary',
      ok: true,
      payload: { a: 1 },
    });
    const { events } = eventLogStore.getState();
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('view_itinerary');
    expect(typeof events[0].ts).toBe('number');
  });

  it('no-ops in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    recordDevEvent({ channel: 'ui-commands', label: 'x', ok: true, payload: {} });
    expect(eventLogStore.getState().events).toHaveLength(0);
  });
});
