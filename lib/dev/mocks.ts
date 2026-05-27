import type { BookingSummary, UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

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
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_01.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_02.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_03.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_007_image_01.jpg',
            caption: 'FOCUS',
          },
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
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_01.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_02.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
        ],
      },
    },
  ],
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary', addOnDecisions: {} } }],
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
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
          {
            id: 'majesty_of_the_danube_scenic_wachau_from_budapest_to_vienna',
            name: 'Majesty of the Danube & Scenic Wachau from Budapest to Vienna',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
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
