import { describe, expect, it } from 'vitest';
import { dispatchEnvelope } from './transport';
import { createUiViewStore } from './ui-view-store';

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
