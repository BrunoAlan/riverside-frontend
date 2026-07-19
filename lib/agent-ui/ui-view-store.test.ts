import { beforeEach, describe, expect, it } from 'vitest';
import type { UiCommand } from './commands';
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
    expect(s.view).toEqual({ type: 'itinerary', itinerary });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c2');
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
      payload: { reasonCode: 'MISSING_DATE' },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.hint).toEqual({
      type: 'soft_redirect',
      reasonCode: 'MISSING_DATE',
    });
    expect(s.lastCorrelationId).toBe('c2');
  });

  it('non-hint command clears existing hint', () => {
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlationId: 'c1',
      payload: { reasonCode: 'MISSING_DATE' },
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
      store.getState().setViewFromDev({ type: 'itinerary' });
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

  it('applyCommand(show_experience_detail) sets detailExperienceId on the itinerary view', () => {
    store.getState().setViewFromUser({ type: 'itinerary', detailCityId: 'vienna' });
    store.getState().applyCommand({
      type: 'show_experience_detail',
      correlationId: 'c-exp-1',
      payload: { experience_id: 'belvedere' },
    });
    const s = store.getState();
    if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(s.view.detailExperienceId).toBe('belvedere');
    expect(s.view.detailCityId).toBe('vienna');
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c-exp-1');
  });

  it('applyCommand(show_experience_detail) with null clears detailExperienceId', () => {
    store.getState().setViewFromUser({ type: 'itinerary', detailExperienceId: 'belvedere' });
    store.getState().applyCommand({
      type: 'show_experience_detail',
      correlationId: 'c-exp-2',
      payload: { experience_id: null },
    });
    const s = store.getState();
    if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(s.view.detailExperienceId).toBeUndefined();
  });

  it('applyCommand(show_experience_detail) is ignored when not on the itinerary view', () => {
    store.getState().applyCommand({
      type: 'show_experience_detail',
      correlationId: 'c-exp-3',
      payload: { experience_id: 'belvedere' },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastCorrelationId).toBe('c-exp-3');
  });

  it('applyCommand(add_experience_to_basket) appends an entry', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-exp-add-1',
      payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
    });
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'belvedere', day: 'Day 3' },
    ]);
  });

  it('applyCommand(add_experience_to_basket) is idempotent for the same (id, day)', () => {
    const add = () =>
      store.getState().applyCommand({
        type: 'add_experience_to_basket',
        correlationId: 'c-exp-add-2',
        payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
      });
    add();
    add();
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'belvedere', day: 'Day 3' },
    ]);
  });

  it('applyCommand(add_experience_to_basket) keeps separate entries for different days', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-exp-add-3',
      payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
    });
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-exp-add-4',
      payload: { experience_id: 'belvedere', day: 'Day 5', passenger_count: 2 },
    });
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'belvedere', day: 'Day 3' },
      { experienceId: 'belvedere', day: 'Day 5' },
    ]);
  });

  it('applyCommand(add_experience_to_basket) without a day records nothing', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'e9',
      payload: { experience_id: 'belvedere' },
    });
    const s = store.getState();
    expect(s.addedExperiences).toEqual([]);
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('e9');
  });

  it('applyCommand(sync_itinerary_experiences) merges new entries', () => {
    store.getState().applyCommand({
      type: 'sync_itinerary_experiences',
      correlationId: 'c-sync-1',
      payload: {
        experiences: [
          {
            experience_id: 'belvedere',
            name: 'Belvedere',
            day: 'Day 5',
            destination: '',
            passenger_count: 2,
          },
        ],
      },
    });
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'belvedere', day: 'Day 5' },
    ]);
    expect(store.getState().lastCorrelationId).toBe('c-sync-1');
  });

  it('applyCommand(sync_itinerary_experiences) dedups against existing entries', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-add',
      payload: { experience_id: 'belvedere', day: 'Day 5', passenger_count: 2 },
    });
    store.getState().applyCommand({
      type: 'sync_itinerary_experiences',
      correlationId: 'c-sync-2',
      payload: {
        experiences: [
          {
            experience_id: 'belvedere',
            day: 'Day 5',
            name: 'B',
            destination: '',
            passenger_count: 2,
          },
          {
            experience_id: 'schonbrunn',
            day: 'Day 6',
            name: 'S',
            destination: '',
            passenger_count: 2,
          },
        ],
      },
    });
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'belvedere', day: 'Day 5' },
      { experienceId: 'schonbrunn', day: 'Day 6' },
    ]);
  });

  it('applyCommand(sync_itinerary_experiences) does not remove entries absent from the payload', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-add',
      payload: { experience_id: 'keepme', day: 'Day 1', passenger_count: 2 },
    });
    store.getState().applyCommand({
      type: 'sync_itinerary_experiences',
      correlationId: 'c-sync-3',
      payload: {
        experiences: [
          { experience_id: 'other', day: 'Day 2', name: 'O', destination: '', passenger_count: 2 },
        ],
      },
    });
    expect(store.getState().addedExperiences).toEqual([
      { experienceId: 'keepme', day: 'Day 1' },
      { experienceId: 'other', day: 'Day 2' },
    ]);
  });

  it('applyCommand(sync_itinerary_experiences) with an empty array is a no-op', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-add',
      payload: { experience_id: 'keepme', day: 'Day 1', passenger_count: 2 },
    });
    store.getState().applyCommand({
      type: 'sync_itinerary_experiences',
      correlationId: 'c-empty',
      payload: { experiences: [] },
    });
    expect(store.getState().addedExperiences).toEqual([{ experienceId: 'keepme', day: 'Day 1' }]);
  });

  it('clearAddedExperiencesFromDev empties addedExperiences and marks source dev', () => {
    const store = createUiViewStore();
    store.getState().applyCommand({
      type: 'sync_itinerary_experiences',
      payload: {
        experiences: [
          {
            experience_id: 'signature_vienna_belvedere_palace',
            name: 'X',
            day: 'Day 5',
            destination: '',
            passenger_count: 2,
          },
        ],
      },
      correlationId: 'c1',
    });
    expect(store.getState().addedExperiences).toHaveLength(1);

    store.getState().clearAddedExperiencesFromDev();

    expect(store.getState().addedExperiences).toEqual([]);
    expect(store.getState().source).toBe('dev');
  });

  it('applyCommand(add_cabin_to_basket) sets selectedCabinId', () => {
    store.getState().applyCommand({
      type: 'add_cabin_to_basket',
      correlationId: 'c-cab-1',
      payload: {
        cabin_id: 'mozart-suite',
        name: 'Mozart Suite',
        category: 'Mozart Suite',
        guests: 2,
        area: 62,
        price_from: null,
        view: 'French Balcony',
      },
    });
    const s = store.getState();
    expect(s.selectedCabinId).toBe('mozart-suite');
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c-cab-1');
  });

  it('applyCommand(show_itinerary_summary) fills the slice and leaves view untouched', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_summary',
      correlationId: 'c1',
      payload: {
        header: { title: 'Danube', subtitle: null, image: null },
        details: {
          guests: '2 people',
          month: null,
          embarkation: null,
          stops: null,
          dates: null,
          price_per_person: null,
          cabin_name: null,
        },
        cabin: null,
        package: null,
        itinerary: null,
        total: null,
      },
    });
    const s = store.getState();
    expect(s.itinerarySummary?.header.title).toBe('Danube');
    expect(s.itinerarySummary?.details.guests).toBe('2 people');
    expect(s.itinerarySummary?.cabin).toBeNull();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c1');
  });

  it('closeItinerarySummary clears the slice with source user', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_summary',
      correlationId: 'c1',
      payload: {
        header: { title: 'Danube', subtitle: null, image: null },
        details: {
          guests: null,
          month: null,
          embarkation: null,
          stops: null,
          dates: null,
          price_per_person: null,
          cabin_name: null,
        },
        cabin: null,
        package: null,
        itinerary: null,
        total: null,
      },
    });
    store.getState().closeItinerarySummary();
    const s = store.getState();
    expect(s.itinerarySummary).toBeNull();
    expect(s.source).toBe('user');
  });

  const SAMPLE_BOOKING_FORM = {
    summary: {
      header: { title: 'Danube', subtitle: null, image: null },
      details: {
        guests: '2 people',
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        pricePerPerson: null,
        cabinName: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    },
    guestCount: 2,
    guests: [],
    agreed: false,
    status: 'editing' as const,
  };

  it('setBookingFormFromDev fills the slice with source dev', () => {
    store.getState().setBookingFormFromDev(SAMPLE_BOOKING_FORM);
    const s = store.getState();
    expect(s.bookingForm?.guestCount).toBe(2);
    expect(s.bookingForm?.summary.header.title).toBe('Danube');
    expect(s.source).toBe('dev');
  });

  it('closeBookingForm clears the slice with source user', () => {
    store.getState().setBookingFormFromDev(SAMPLE_BOOKING_FORM);
    store.getState().closeBookingForm();
    const s = store.getState();
    expect(s.bookingForm).toBeNull();
    expect(s.source).toBe('user');
  });

  describe('itinerary active tab', () => {
    it('setItineraryTabFromUser switches the tab and marks the source as user', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

      store.getState().setItineraryTabFromUser('excursions');

      const { view, source } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('excursions');
      expect(source).toBe('user');
    });

    it('setItineraryTabFromUser preserves the rest of the itinerary view', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: undefined,
        detailCityId: 'budapest',
      });

      store.getState().setItineraryTabFromUser('excursions');

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.detailCityId).toBe('budapest');
    });

    it('setItineraryTabFromUser is a no-op when the view is not an itinerary', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'start' });

      store.getState().setItineraryTabFromUser('excursions');

      expect(store.getState().view).toEqual({ type: 'start' });
    });
  });

  describe('applyCommand(show_itinerary_tab)', () => {
    it('switches the tab and marks the source as agent', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c1',
        payload: { tab: 'excursions' },
      });

      const { view, source } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('excursions');
      expect(source).toBe('agent');
    });

    it('leaves a non-itinerary view untouched', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'start' });

      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c1',
        payload: { tab: 'excursions' },
      });

      expect(store.getState().view).toEqual({ type: 'start' });
    });

    it('collapses an open city detail when moving to excursions', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: undefined,
        detailCityId: 'vienna',
      });

      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c2',
        payload: { tab: 'excursions' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.detailCityId).toBeUndefined();
    });

    it('keeps an open city detail when moving back to overview', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: undefined,
        activeTab: 'excursions',
        detailCityId: 'vienna',
      });

      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c3',
        payload: { tab: 'overview' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.detailCityId).toBe('vienna');
    });
  });

  // Mirrors `itineraryPayload` above, plus the experiences the tab-forcing logic
  // needs: it decides by asking whether the open city already renders the
  // experience the agent is pointing at.
  function itineraryWithVienna() {
    return {
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
          experiences: [
            {
              id: 'exp-vienna',
              name: 'Belvedere Palace',
              type: 'private_concert',
              venue: 'Belvedere Palace',
              description: 'Private concert.',
            },
          ],
        },
      ],
    };
  }

  describe('applyCommand(show_experience_detail) tab behaviour', () => {
    it('switches to the excursions tab so the detail is visible', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

      store.getState().applyCommand({
        type: 'show_experience_detail',
        correlationId: 'c1',
        payload: { experience_id: 'exp-1' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('excursions');
      expect(view.detailExperienceId).toBe('exp-1');
    });

    it('does not change the tab when closing the detail', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });
      store.getState().setItineraryTabFromUser('overview');

      store.getState().applyCommand({
        type: 'show_experience_detail',
        correlationId: 'c2',
        payload: { experience_id: null },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('overview');
      expect(view.detailExperienceId).toBeUndefined();
    });

    it('does not change the tab when the open city already shows that experience', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: itineraryWithVienna(),
        activeTab: 'overview',
        detailCityId: 'vienna',
      });

      store.getState().applyCommand({
        type: 'show_experience_detail',
        correlationId: 'c3',
        payload: { experience_id: 'exp-vienna' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('overview');
      expect(view.detailCityId).toBe('vienna');
      expect(view.detailExperienceId).toBe('exp-vienna');
    });

    it('switches the tab for an experience the open city does not show', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: itineraryWithVienna(),
        activeTab: 'overview',
        detailCityId: 'vienna',
      });

      store.getState().applyCommand({
        type: 'show_experience_detail',
        correlationId: 'c4',
        payload: { experience_id: 'exp-from-another-city' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('excursions');
    });

    it('switches the tab when a city is open but its data is unavailable', () => {
      const store = createUiViewStore();
      store.getState().setViewFromUser({
        type: 'itinerary',
        itinerary: undefined,
        activeTab: 'overview',
        detailCityId: 'vienna',
      });

      store.getState().applyCommand({
        type: 'show_experience_detail',
        correlationId: 'c5',
        payload: { experience_id: 'exp-1' },
      });

      const { view } = store.getState();
      if (view.type !== 'itinerary') throw new Error('expected itinerary view');
      expect(view.activeTab).toBe('excursions');
    });
  });

  describe('agent suggestions', () => {
    const suggestionsCommand = (
      correlationId: string
    ): Extract<UiCommand, { type: 'show_suggestions' }> => ({
      type: 'show_suggestions',
      correlationId,
      payload: {
        suggestions: [
          { id: 'a', text: 'What can I do in Budapest?' },
          { id: 'b', text: 'Tell me more about Belvedere', label: 'Belvedere?' },
        ],
      },
    });

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

    it('initializes with agentSuggestions null', () => {
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('show_suggestions maps wire pills, keyed by correlationId', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      expect(store.getState().agentSuggestions).toEqual({
        key: 's1',
        pills: [
          { id: 'a', label: 'What can I do in Budapest?', message: 'What can I do in Budapest?' },
          { id: 'b', label: 'Belvedere?', message: 'Tell me more about Belvedere' },
        ],
      });
      expect(store.getState().source).toBe('agent');
    });

    it('show_suggestions with an empty list clears the override', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_suggestions',
        correlationId: 's2',
        payload: { suggestions: [] },
      });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('a view-replacing command clears the override', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c2',
        payload: { itinerary },
      });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('field-level commands keep the override', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c2',
        payload: { tab: 'excursions' },
      });
      expect(store.getState().agentSuggestions?.key).toBe('s1');
    });

    it('setViewFromUser keeps the override for the same view type', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().setViewFromUser({ type: 'itinerary', itinerary, activeTab: 'excursions' });
      expect(store.getState().agentSuggestions?.key).toBe('s1');
    });

    it('setViewFromUser clears the override when the view type changes', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().setViewFromUser({ type: 'start' });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('setAgentSuggestionsFromDev sets and clears the override with source dev', () => {
      store
        .getState()
        .setAgentSuggestionsFromDev([{ id: 'd1', label: 'Dev pill', message: 'Dev pill' }]);
      expect(store.getState().agentSuggestions).toEqual({
        key: 'dev',
        pills: [{ id: 'd1', label: 'Dev pill', message: 'Dev pill' }],
      });
      expect(store.getState().source).toBe('dev');
      store.getState().setAgentSuggestionsFromDev(null);
      expect(store.getState().agentSuggestions).toBeNull();
    });
  });

  describe('booking form', () => {
    const summaryWire = {
      header: { title: 'Danube', subtitle: null, image: null },
      details: {
        guests: '2 People',
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: '$5,000',
        cabin_name: null,
      },
      cabin: null,
      package: { price_per_person: '$5,000', name: null, inclusions: [] },
      itinerary: null,
      total: '$10,000',
    };

    const openForm = (guestCount = 2) =>
      store.getState().applyCommand({
        type: 'show_booking_form',
        correlationId: 'bf1',
        payload: { summary: summaryWire, guest_count: guestCount },
      });

    it('show_booking_form opens an editing form with empty guests', () => {
      openForm(2);
      const form = store.getState().bookingForm;
      expect(form?.guests).toHaveLength(2);
      expect(form?.agreed).toBe(false);
      expect(form?.status).toBe('editing');
      expect(store.getState().source).toBe('agent');
    });

    it('show_booking_form clamps guest_count to at least 1', () => {
      openForm(0);
      expect(store.getState().bookingForm?.guests).toHaveLength(1);
    });

    it('update_booking_form patches only the named fields', () => {
      openForm(2);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf2',
        payload: { guests: [{ index: 0, first_name: 'Juan', email: 'juan@example.com' }] },
      });
      const guests = store.getState().bookingForm?.guests;
      expect(guests?.[0]).toMatchObject({
        firstName: 'Juan',
        email: 'juan@example.com',
        lastName: '',
      });
      expect(guests?.[1].firstName).toBe('');
    });

    it('update_booking_form ignores out-of-range indices and unknown country codes', () => {
      openForm(1);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf3',
        payload: {
          guests: [
            { index: 5, first_name: 'Nadie' },
            { index: 0, country_code: 'XX', phone: '123' },
          ],
        },
      });
      const guests = store.getState().bookingForm?.guests;
      expect(guests).toHaveLength(1);
      expect(guests?.[0].countryCode).toBe('US');
      expect(guests?.[0].phone).toBe('123');
    });

    it('update_booking_form without an open form only tags the correlation', () => {
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf4',
        payload: { guests: [{ index: 0, first_name: 'Juan' }] },
      });
      expect(store.getState().bookingForm).toBeNull();
      expect(store.getState().lastCorrelationId).toBe('bf4');
    });

    it('no command can set agreed', () => {
      openForm(1);
      store.getState().setAgreedFromUser(true);
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf5',
        payload: { guests: [{ index: 0, first_name: 'Juan' }] },
      });
      expect(store.getState().bookingForm?.agreed).toBe(true);
    });

    it('user actions edit guests, consent, and submit status', () => {
      openForm(1);
      store.getState().updateGuestFromUser(0, { firstName: 'Ana' });
      store.getState().setAgreedFromUser(true);
      store.getState().submitBookingFormFromUser();
      const form = store.getState().bookingForm;
      expect(form?.guests[0].firstName).toBe('Ana');
      expect(form?.agreed).toBe(true);
      expect(form?.status).toBe('submitting');
      expect(store.getState().source).toBe('user');
    });

    it('close_booking_form clears the slice', () => {
      openForm(1);
      store.getState().submitBookingFormFromUser();
      store.getState().applyCommand({ type: 'close_booking_form', correlationId: 'bf6' });
      expect(store.getState().bookingForm).toBeNull();
    });

    it('update_booking_form during submitting preserves status: submitting', () => {
      openForm(1);
      store.getState().submitBookingFormFromUser();
      store.getState().applyCommand({
        type: 'update_booking_form',
        correlationId: 'bf7',
        payload: { guests: [{ index: 0, first_name: 'Juan' }] },
      });
      const form = store.getState().bookingForm;
      expect(form?.status).toBe('submitting');
      expect(form?.guests[0].firstName).toBe('Juan');
    });

    it('show_booking_form while a form is open resets to a fresh empty editing form', () => {
      openForm(2);
      store.getState().updateGuestFromUser(0, { firstName: 'Ana' });
      store.getState().setAgreedFromUser(true);
      openForm(1);
      const form = store.getState().bookingForm;
      expect(form?.status).toBe('editing');
      expect(form?.agreed).toBe(false);
      expect(form?.guests).toHaveLength(1);
      expect(form?.guests[0].firstName).toBe('');
    });

    it('close_booking_form with no open form leaves bookingForm null and only tags source/correlation', () => {
      store.getState().applyCommand({ type: 'close_booking_form', correlationId: 'bf8' });
      const s = store.getState();
      expect(s.bookingForm).toBeNull();
      expect(s.source).toBe('agent');
      expect(s.lastCorrelationId).toBe('bf8');
    });
  });
});
