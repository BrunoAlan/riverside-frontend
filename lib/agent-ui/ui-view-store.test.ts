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

  it('applyCommand(show_itinerary_options) maps the itinerary into the itinerary view', () => {
    const itinerary = {
      id: 'danube_legends',
      name: 'Danube Legends',
      duration: { days: 12, nights: 11 },
      match_score: 0.6667,
      departure_dates: ['2026-04-22'],
      center: [16.57, 48.15] as [number, number],
      zoom: 6,
      cities: [
        {
          id: 'budapest',
          name: 'Budapest',
          country: 'Hungary',
          image: 'https://res.cloudinary.com/demo/image/upload/budapest.jpg',
          days: 'Days 1, 2, 6 & 7',
          lon: 19.0402,
          lat: 47.4979,
        },
      ],
    };
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlationId: 'c2',
      payload: { itinerary },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'itinerary', itinerary, addOnDecisions: {} });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c2');
  });

  it('setAddOnDecision preserves the itinerary on the view', () => {
    const itinerary = {
      id: 'danube_legends',
      name: 'Danube Legends',
      duration: { days: 12, nights: 11 },
      match_score: 0.6667,
      departure_dates: ['2026-04-22'],
      center: [16.57, 48.15] as [number, number],
      zoom: 6,
      cities: [
        {
          id: 'budapest',
          name: 'Budapest',
          country: 'Hungary',
          image: 'https://res.cloudinary.com/demo/image/upload/budapest.jpg',
          days: 'Days 1, 2, 6 & 7',
          lon: 19.0402,
          lat: 47.4979,
        },
      ],
    };
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlationId: 'c2',
      payload: { itinerary },
    });
    store.getState().setAddOnDecision('budapest-extra', 'confirmed');
    expect(store.getState().view).toEqual({
      type: 'itinerary',
      itinerary,
      addOnDecisions: { 'budapest-extra': 'confirmed' },
    });
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

  describe('cabin selection', () => {
    const cabin = {
      id: 'owners-suite',
      name: "Owner's Suite",
      image: '/cabin/1.png',
      guests: 2,
      area: 80,
      price_from: 12229,
      view: 'Balcony',
      detail: {
        gallery: ['/cabin-modal/1.png'],
        bedroom: ['King-size bed'],
        bathroom: ['Single vanity'],
        amenities: ['In-suite safe'],
      },
    };

    it('applyCommand(show_cabin_options) loads the list on cabin_selection', () => {
      store.getState().applyCommand({
        type: 'show_cabin_options',
        correlationId: 'co1',
        payload: { cabins: [cabin] },
      });
      const s = store.getState();
      expect(s.view).toEqual({ type: 'cabin_selection', cabins: [cabin] });
      expect(s.source).toBe('agent');
      expect(s.lastCorrelationId).toBe('co1');
      expect(s.hint).toBeNull();
    });

    it('applyCommand(show_cabin_detail) sets detailCabinId and preserves the list', () => {
      store.getState().applyCommand({
        type: 'show_cabin_options',
        correlationId: 'co1',
        payload: { cabins: [cabin] },
      });
      store.getState().applyCommand({
        type: 'show_cabin_detail',
        correlationId: 'cd1',
        payload: { cabin_id: 'owners-suite' },
      });
      const s = store.getState();
      if (s.view.type !== 'cabin_selection') throw new Error('expected cabin_selection view');
      expect(s.view.detailCabinId).toBe('owners-suite');
      expect(s.view.cabins).toEqual([cabin]);
      expect(s.lastCorrelationId).toBe('cd1');
    });

    it('applyCommand(show_cabin_detail) with null clears the detail, keeping the list', () => {
      store.getState().applyCommand({
        type: 'show_cabin_options',
        correlationId: 'co1',
        payload: { cabins: [cabin] },
      });
      store.getState().applyCommand({
        type: 'show_cabin_detail',
        correlationId: 'cd1',
        payload: { cabin_id: 'owners-suite' },
      });
      store.getState().applyCommand({
        type: 'show_cabin_detail',
        correlationId: 'cd2',
        payload: { cabin_id: null },
      });
      const s = store.getState();
      if (s.view.type !== 'cabin_selection') throw new Error('expected cabin_selection view');
      expect(s.view.detailCabinId).toBeUndefined();
      expect(s.view.cabins).toEqual([cabin]);
    });

    it('show_cabin_detail is a no-op on the view when not on cabin_selection', () => {
      store.getState().applyCommand({ type: 'show_discovery_canvas', correlationId: 'c1' });
      store.getState().applyCommand({
        type: 'show_cabin_detail',
        correlationId: 'cd3',
        payload: { cabin_id: 'mozart-suite' },
      });
      const s = store.getState();
      expect(s.view).toEqual({ type: 'presentation' });
      expect(s.lastCorrelationId).toBe('cd3');
    });
  });

  const itineraryPayload = {
    id: 'danube_legends',
    name: 'Danube Legends',
    duration: { days: 12, nights: 11 },
    match_score: 0.6667,
    departure_dates: ['2026-04-22'],
    center: [16.57, 48.15] as [number, number],
    zoom: 6,
    cities: [
      {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        image: 'https://example.com/vienna.jpg',
        days: 'Days 5, 10 & 11',
        lon: 16.3738,
        lat: 48.2082,
      },
    ],
  };

  it('applyCommand(show_city_detail) sets detailCityId on the itinerary view', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlationId: 'c1',
      payload: { itinerary: itineraryPayload },
    });
    store.getState().applyCommand({
      type: 'show_city_detail',
      correlationId: 'c2',
      payload: { city_id: 'vienna' },
    });
    const s = store.getState();
    if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(s.view.detailCityId).toBe('vienna');
    expect(s.view.itinerary?.id).toBe('danube_legends');
    expect(s.view.addOnDecisions).toEqual({});
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c2');
  });

  it('applyCommand(show_city_detail) with null clears detailCityId', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlationId: 'c1',
      payload: { itinerary: itineraryPayload },
    });
    store.getState().applyCommand({
      type: 'show_city_detail',
      correlationId: 'c2',
      payload: { city_id: 'vienna' },
    });
    store.getState().applyCommand({
      type: 'show_city_detail',
      correlationId: 'c3',
      payload: { city_id: null },
    });
    const s = store.getState();
    if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(s.view.detailCityId).toBeUndefined();
  });

  it('applyCommand(show_city_detail) is a no-op on the view when not on itinerary', () => {
    store.getState().applyCommand({
      type: 'show_city_detail',
      correlationId: 'c1',
      payload: { city_id: 'vienna' },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastCorrelationId).toBe('c1');
  });

  it('setAddOnDecision preserves detailCityId', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlationId: 'c1',
      payload: { itinerary: itineraryPayload },
    });
    store.getState().applyCommand({
      type: 'show_city_detail',
      correlationId: 'c2',
      payload: { city_id: 'vienna' },
    });
    store.getState().setAddOnDecision('vienna-addon', 'confirmed');
    const s = store.getState();
    if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(s.view.detailCityId).toBe('vienna');
    expect(s.view.addOnDecisions).toEqual({ 'vienna-addon': 'confirmed' });
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
