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
      correlationId: 'c1',
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
      correlationId: 'c2',
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

  it('applyCommand(show_destination_detail) maps destination and images into view', () => {
    store.getState().applyCommand({
      type: 'show_destination_detail',
      correlationId: 'd1',
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
          {
            url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
            caption: 'Riverside terrace',
          },
        ],
      },
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
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
        {
          url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
          caption: 'Riverside terrace',
        },
      ],
    });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('d1');
  });

  it('applyCommand(soft_redirect) sets hint without changing view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlationId: 'c1',
    });
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlationId: 'c2',
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
      correlationId: 'c1',
      payload: { reason_code: 'MISSING_DATE' },
    });
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlationId: 'c2',
    });
    expect(store.getState().hint).toBeNull();
  });

  it('setViewFromDev sets view + dev source and clears lastCorrelationId', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlationId: 'c1',
    });
    store.getState().setViewFromDev({
      type: 'dream_stage',
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: [],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
          caption: 'A',
        },
      ],
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: [],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
          caption: 'A',
        },
      ],
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

  describe('booking summary', () => {
    const snapshot = {
      people: { label: '2 People' },
      month: { label: 'March' },
      embarkation: { label: 'Budapest' },
      stops: { primary: 'Bratislava', extra: 3 },
      duration: { label: '5 days' },
      price: { label: 'from 2,368 pp.' },
      slots: [
        { label: 'Draft itinerary', state: 'active' as const },
        { label: 'Empty slot', state: 'empty' as const },
        { label: 'Empty slot', state: 'empty' as const },
      ],
      cta: { label: 'Continue to booking', enabled: true },
    };

    it('initializes with bookingSummary null', () => {
      expect(store.getState().bookingSummary).toBeNull();
    });

    it('applyCommand(set_booking_summary) stores the snapshot and tags source agent', () => {
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      const s = store.getState();
      expect(s.bookingSummary).toEqual(snapshot);
      expect(s.source).toBe('agent');
      expect(s.lastCorrelationId).toBe('b1');
    });

    it('set_booking_summary does not change view or hint', () => {
      store.getState().applyCommand({ type: 'show_discovery_canvas', correlationId: 'c1' });
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      const s = store.getState();
      expect(s.view).toEqual({ type: 'presentation' });
      expect(s.hint).toBeNull();
    });

    it('other commands do not clear bookingSummary', () => {
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      store.getState().applyCommand({ type: 'show_discovery_canvas', correlationId: 'c2' });
      expect(store.getState().bookingSummary).toEqual(snapshot);
    });

    it('setViewFromDev does not clear bookingSummary', () => {
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      store.getState().setViewFromDev({ type: 'itinerary', addOnDecisions: {} });
      expect(store.getState().bookingSummary).toEqual(snapshot);
    });

    it('setViewFromUser does not clear bookingSummary', () => {
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      store.getState().setViewFromUser({ type: 'presentation' });
      expect(store.getState().bookingSummary).toEqual(snapshot);
    });

    it('setBookingSummaryFromDev(null) clears the summary and tags source dev', () => {
      store.getState().applyCommand({
        type: 'set_booking_summary',
        correlationId: 'b1',
        payload: snapshot,
      });
      store.getState().setBookingSummaryFromDev(null);
      const s = store.getState();
      expect(s.bookingSummary).toBeNull();
      expect(s.source).toBe('dev');
    });

    it('setBookingSummaryFromDev(snapshot) sets the summary and tags source dev', () => {
      store.getState().setBookingSummaryFromDev(snapshot);
      const s = store.getState();
      expect(s.bookingSummary).toEqual(snapshot);
      expect(s.source).toBe('dev');
    });
  });

  describe('cabin detail', () => {
    it('applyCommand(set_cabin_detail) with a cabin_id opens the detail on cabin_selection', () => {
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlationId: 'cd1',
        payload: { cabin_id: 'owners-suite' },
      });
      const s = store.getState();
      expect(s.view).toEqual({ type: 'cabin_selection', detailCabinId: 'owners-suite' });
      expect(s.source).toBe('agent');
      expect(s.lastCorrelationId).toBe('cd1');
      expect(s.hint).toBeNull();
    });

    it('applyCommand(set_cabin_detail) with null closes the detail', () => {
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlationId: 'cd2',
        payload: { cabin_id: null },
      });
      expect(store.getState().view).toEqual({ type: 'cabin_selection' });
    });

    it('set_cabin_detail switches to cabin_selection from another view', () => {
      store.getState().applyCommand({ type: 'show_discovery_canvas', correlationId: 'c1' });
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlationId: 'cd3',
        payload: { cabin_id: 'mozart-suite' },
      });
      expect(store.getState().view).toEqual({
        type: 'cabin_selection',
        detailCabinId: 'mozart-suite',
      });
    });
  });

  describe('add-on decisions', () => {
    it('setAddOnDecision writes confirmed into the active itinerary view', () => {
      store.getState().setViewFromUser({ type: 'itinerary', addOnDecisions: {} });
      store.getState().setAddOnDecision('vienna-chamber-music', 'confirmed');
      expect(store.getState().view).toEqual({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      expect(store.getState().source).toBe('user');
    });

    it('setAddOnDecision writes rejected and overwrites prior decisions', () => {
      store.getState().setViewFromUser({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      store.getState().setAddOnDecision('vienna-chamber-music', 'rejected');
      expect(store.getState().view).toEqual({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'rejected' },
      });
    });

    it('setAddOnDecision is a no-op when the active view is not itinerary', () => {
      store.getState().setViewFromUser({ type: 'presentation' });
      store.getState().setAddOnDecision('vienna-chamber-music', 'confirmed');
      expect(store.getState().view).toEqual({ type: 'presentation' });
    });

    it('re-entering the itinerary view resets addOnDecisions', () => {
      store.getState().setViewFromUser({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      store.getState().setViewFromUser({ type: 'presentation' });
      store.getState().setViewFromUser({ type: 'itinerary', addOnDecisions: {} });
      expect(store.getState().view).toEqual({ type: 'itinerary', addOnDecisions: {} });
    });
  });
});
