import { beforeEach, describe, expect, it } from 'vitest';
import { createUiViewStore } from './ui-view-store';

describe('ui-view-store', () => {
  let store: ReturnType<typeof createUiViewStore>;

  beforeEach(() => {
    store = createUiViewStore();
  });

  it('initializes with start view and initial source', () => {
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.hint).toBeNull();
    expect(s.source).toBe('initial');
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('applyCommand(show_discovery_canvas) maps to presentation view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c1');
    expect(s.hint).toBeNull();
  });

  it('applyCommand(show_itinerary_options) maps to compare_itinerary view', () => {
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
      type: 'compare_itinerary',
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

  it('applyCommand(show_dream_stage) maps payload images into view', () => {
    store.getState().applyCommand({
      type: 'show_dream_stage',
      correlation_id: 'd1',
      payload: {
        images: [
          { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', tag: 'Venice' },
          { src: 'https://res.cloudinary.com/demo/image/upload/b.jpg', tag: 'Budapest' },
        ],
      },
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
      images: [
        { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', tag: 'Venice' },
        { src: 'https://res.cloudinary.com/demo/image/upload/b.jpg', tag: 'Budapest' },
      ],
    });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('d1');
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
    expect(s.view).toEqual({ type: 'presentation' });
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
    store.getState().setViewFromDev({
      type: 'dream_stage',
      images: [{ src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', tag: 'A' }],
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
      images: [{ src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', tag: 'A' }],
    });
    expect(s.source).toBe('dev');
    expect(s.lastCorrelationId).toBeNull();
  });

  it('setViewFromUser sets view + user source and clears lastCorrelationId', () => {
    store.getState().setViewFromUser({ type: 'presentation' });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.source).toBe('user');
    expect(s.hint).toBeNull();
    expect(s.lastCorrelationId).toBeNull();
  });

  it('recordParseError stores last error without touching view', () => {
    store.getState().recordParseError({ message: 'bad payload' });
    const s = store.getState();
    expect(s.lastError).toEqual({ message: 'bad payload' });
    expect(s.view).toEqual({ type: 'start' });
  });
});
