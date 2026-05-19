import { beforeEach, describe, expect, it } from 'vitest';
import { createUiViewStore } from './ui-view-store';

describe('ui-view-store', () => {
  let store: ReturnType<typeof createUiViewStore>;

  beforeEach(() => {
    store = createUiViewStore();
  });

  it('initializes with discovery_canvas view and initial source', () => {
    const s = store.getState();
    expect(s.view).toEqual({ type: 'discovery_canvas' });
    expect(s.hint).toBeNull();
    expect(s.source).toBe('initial');
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('applyCommand(show_discovery_canvas) sets view + agent source + correlation', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'discovery_canvas' });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c1');
    expect(s.hint).toBeNull();
  });

  it('applyCommand(show_itinerary_options) replaces view with options', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlation_id: 'c2',
      payload: {
        options: [
          {
            id: 'a',
            name: 'A',
            embarkation_port: 'X',
            disembarkation_port: 'Y',
            match_score: 1,
          },
        ],
      },
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'itinerary_options',
      options: [
        {
          id: 'a',
          name: 'A',
          embarkation_port: 'X',
          disembarkation_port: 'Y',
          match_score: 1,
        },
      ],
    });
    expect(s.source).toBe('agent');
  });

  it('applyCommand(soft_redirect) sets hint without changing view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlation_id: 'c2',
      payload: { reason_code: 'MISSING_DATE', missing: ['dates'] },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'discovery_canvas' });
    expect(s.hint).toEqual({
      type: 'soft_redirect',
      reasonCode: 'MISSING_DATE',
      missing: ['dates'],
    });
    expect(s.lastCorrelationId).toBe('c2');
  });

  it('non-hint command clears existing hint', () => {
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlation_id: 'c1',
      payload: { reason_code: 'MISSING_DATE' },
    });
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c2',
    });
    expect(store.getState().hint).toBeNull();
  });

  it('setViewFromDev sets view + dev source and clears lastCorrelationId', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    store.getState().setViewFromDev({ type: 'discovery_canvas' });
    const s = store.getState();
    expect(s.source).toBe('dev');
    expect(s.lastCorrelationId).toBeNull();
  });

  it('recordParseError stores last error without touching view', () => {
    store.getState().recordParseError({ message: 'bad payload' });
    const s = store.getState();
    expect(s.lastError).toEqual({ message: 'bad payload' });
    expect(s.view).toEqual({ type: 'discovery_canvas' });
  });
});
