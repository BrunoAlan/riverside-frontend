import type { BookingSummary, UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

const danubeLegends = {
  id: 'danube_legends_from_budapest_to_vienna',
  name: 'Danube Legends from Budapest to Vienna',
  duration: { days: 12, nights: 11 },
  match_score: 0.6667,
  departure_dates: ['2026-04-22', '2026-05-06', '2026-05-20'],
  center: [16.570283333333332, 48.15495000000001] as [number, number],
  zoom: 6,
  cities: [
    {
      id: 'budapest',
      name: 'Budapest',
      country: 'Hungary',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 1, 2, 6 & 7',
      lon: 19.0402,
      lat: 47.4979,
      day_details: [
        {
          day: 'Day 01',
          description: 'Arrive in Budapest and embark. Evening welcome dinner aboard.',
        },
        { day: 'Day 02', description: 'Guided tour of Buda Castle and the Fisherman’s Bastion.' },
      ],
    },
    {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
      days: 'Days 5, 10 & 11',
      lon: 16.3738,
      lat: 48.2082,
      day_details: [
        {
          day: 'Day 05',
          description:
            'Vienna, once an imperial capital, boasts grand Baroque architecture and historic charm.',
        },
        {
          day: 'Day 10',
          description: 'A day among palaces, cathedrals, museums and romantic coffee houses.',
        },
      ],
    },
  ],
};

export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  start: [{ id: 'default', label: 'Default', view: { type: 'start' } }],
  presentation: [{ id: 'default', label: 'Video playing', view: { type: 'presentation' } }],
  dream_stage: [
    {
      id: 'default',
      label: 'Vienna detail (4 images)',
      view: {
        type: 'dream_stage',
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: ['City of Music'],
        },
        images: [
          { url: '/dream/1.jpg', caption: 'SIGNATURE VIENNA: VIP EVENING' },
          { url: '/dream/2.jpg', caption: 'SIGNATURE VIENNA: VIP EVENING' },
          { url: '/dream/3.jpg', caption: 'SIGNATURE VIENNA: VIP EVENING' },
          { url: '/dream/4.jpg', caption: 'FOCUS' },
        ],
      },
    },
    {
      id: 'partial',
      label: 'Vienna detail (2 images)',
      view: {
        type: 'dream_stage',
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: ['City of Music'],
        },
        images: [
          { url: '/dream/1.jpg', caption: 'SIGNATURE VIENNA: VIP EVENING' },
          { url: '/dream/2.jpg', caption: 'SIGNATURE VIENNA: VIP EVENING' },
        ],
      },
    },
  ],
  itinerary: [
    {
      id: 'danube_legends',
      label: 'Danube Legends (agent payload)',
      view: { type: 'itinerary', addOnDecisions: {}, itinerary: danubeLegends },
    },
    {
      id: 'danube_legends_detail',
      label: 'Detail open (Vienna)',
      view: {
        type: 'itinerary',
        addOnDecisions: {},
        itinerary: danubeLegends,
        detailCityId: 'vienna',
      },
    },
  ],
  compare_itinerary: [
    {
      id: 'two_danube_options',
      label: 'Two Danube options',
      view: {
        type: 'compare_itinerary',
        options: [
          {
            id: 'majesty_of_the_danube',
            name: 'Majesty of the Danube',
            duration: { days: 8, nights: 7 },
            match_score: 1.0,
            departure_dates: ['2026-04-22', '2026-05-06'],
            center: [17.5, 48.0],
            zoom: 6.8,
            cities: [
              {
                id: 'budapest',
                name: 'Budapest',
                country: 'Hungary',
                image:
                  'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
                days: 'Days 1 & 2',
                lon: 19.0402,
                lat: 47.4979,
              },
              {
                id: 'vienna',
                name: 'Vienna',
                country: 'Austria',
                image:
                  'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
                days: 'Days 7 & 8',
                lon: 16.3738,
                lat: 48.2082,
              },
            ],
          },
          {
            id: 'majesty_of_the_danube_scenic_wachau_from_budapest_to_vienna',
            name: 'Majesty of the Danube & Scenic Wachau from Budapest to Vienna',
            duration: { days: 10, nights: 9 },
            match_score: 1.0,
            departure_dates: ['2026-09-02', '2026-09-16'],
            center: [16.3, 48.3],
            zoom: 7,
            cities: [
              {
                id: 'budapest',
                name: 'Budapest',
                country: 'Hungary',
                image:
                  'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
                days: 'Days 1 & 2',
                lon: 19.0402,
                lat: 47.4979,
              },
              {
                id: 'wachau_valley',
                name: 'Wachau Valley',
                country: 'Austria',
                image:
                  'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
                days: 'Days 6 & 7',
                lon: 15.33,
                lat: 48.35,
              },
              {
                id: 'vienna',
                name: 'Vienna',
                country: 'Austria',
                image:
                  'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
                days: 'Days 9 & 10',
                lon: 16.3738,
                lat: 48.2082,
              },
            ],
          },
        ],
      },
    },
  ],
  cabin_selection: [
    { id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } },
    {
      id: 'with_detail',
      label: "Detail open (Owner's Suite)",
      view: { type: 'cabin_selection', detailCabinId: 'owners-suite' },
    },
  ],
};

export interface BookingSummaryMock {
  id: string;
  label: string;
  summary: BookingSummary | null;
}

export const BOOKING_SUMMARY_MOCKS: readonly BookingSummaryMock[] = [
  {
    id: 'clear',
    label: 'Hidden (null)',
    summary: null,
  },
  {
    id: 'empty',
    label: 'All placeholders',
    summary: {
      people: null,
      month: null,
      embarkation: null,
      stops: null,
      duration: null,
      price: null,
      slots: [],
      cta: { label: 'Continue to booking', enabled: false },
    },
  },
  {
    id: 'partial',
    label: 'Partial (people/month/port)',
    summary: {
      people: { label: '2 People' },
      month: { label: 'March' },
      embarkation: { label: 'Budapest' },
      stops: null,
      duration: null,
      price: null,
      slots: [{ label: 'Draft itinerary', state: 'active' }],
      cta: { label: 'Continue to booking', enabled: false },
    },
  },
  {
    id: 'full',
    label: 'Full (matches Figma)',
    summary: {
      people: { label: '2 People' },
      month: { label: 'March' },
      embarkation: { label: 'Budapest' },
      stops: { primary: 'Bratislava', extra: 3 },
      duration: { label: '5 days' },
      price: { label: 'from 2,368 pp.' },
      slots: [
        { label: 'Draft itinerary', state: 'active' },
        { label: 'Empty slot', state: 'empty' },
        { label: 'Empty slot', state: 'empty' },
      ],
      cta: { label: 'Continue to booking', enabled: true },
    },
  },
];
