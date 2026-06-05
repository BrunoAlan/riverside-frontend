import { afterEach, describe, expect, it } from 'vitest';
import { eventLogStore } from '../dev/event-log-store';
import { dispatchEnvelope } from './transport';
import { createUiViewStore } from './ui-view-store';

afterEach(() => {
  eventLogStore.getState().clear();
});

const validDestinationDetail = {
  type: 'show_destination_detail',
  correlationId: 'cmd-1',
  payload: {
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: ['City of Music'],
    },
    images: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        caption: 'Vienna at dusk',
      },
    ],
  },
};

describe('dispatchEnvelope', () => {
  it('applies a valid command and updates the store view', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      { correlationId: 'env-1', commands: [validDestinationDetail] },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
      destination: validDestinationDetail.payload.destination,
      images: validDestinationDetail.payload.images,
    });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('cmd-1');
    expect(s.lastError).toBeNull();
  });

  it('records a parse error for an unknown command type without changing the view', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-2',
        commands: [{ type: 'show_welcome_canvas', correlationId: 'cmd-2', payload: {} }],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).not.toBeNull();
    expect(s.lastError?.correlationId).toBe('cmd-2');
  });

  it('records a parse error for a malformed payload', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-3',
        commands: [
          {
            type: 'show_destination_detail',
            correlationId: 'cmd-3',
            payload: {
              images: [
                {
                  url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
                  caption: 'x',
                },
              ],
            },
          },
        ],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastError).not.toBeNull();
    expect(s.lastError?.correlationId).toBe('cmd-3');
  });

  it('applies commands in order; last view-changing command wins', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-4',
        commands: [
          { type: 'show_discovery_canvas', correlationId: 'cmd-a' },
          validDestinationDetail,
        ],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view.type).toBe('dream_stage');
    expect(s.lastCorrelationId).toBe('cmd-1');
  });

  it('does not throw when commands is missing or not an array', () => {
    const store = createUiViewStore();
    expect(() => dispatchEnvelope({ correlationId: 'env-5' }, store.getState())).not.toThrow();
    expect(() =>
      dispatchEnvelope({ correlationId: 'env-6', commands: 'not-an-array' }, store.getState())
    ).not.toThrow();
    expect(store.getState().view).toEqual({ type: 'start' });
  });
});

describe('dispatchEnvelope dev event logging', () => {
  it('records an applied command with the parsed payload and raw envelope', () => {
    const store = createUiViewStore();
    const envelope = {
      correlationId: 'env-1',
      sessionId: 'sess-1',
      commands: [validDestinationDetail],
    };
    dispatchEnvelope(envelope, store.getState());
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'ui-commands',
      label: 'show_destination_detail',
      correlationId: 'cmd-1',
      ok: true,
    });
    expect(events[0].envelope).toBe(envelope);
  });

  it('records a parse error event with ok:false', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      { correlationId: 'env-2', commands: [{ type: 'nope', correlationId: 'cmd-2', payload: {} }] },
      store.getState()
    );
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'ui-commands',
      label: 'parse-error',
      ok: false,
      correlationId: 'cmd-2',
    });
    expect(events[0].payload).toEqual({ type: 'nope', correlationId: 'cmd-2', payload: {} });
  });

  it('records an envelope-error for a malformed envelope', () => {
    const store = createUiViewStore();
    dispatchEnvelope({ correlationId: 'env-bad', commands: 'not-an-array' }, store.getState());
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'ui-commands',
      label: 'envelope-error',
      ok: false,
    });
    expect(store.getState().view).toEqual({ type: 'start' });
  });
});
