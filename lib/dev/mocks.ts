import type { Cabin } from '@/lib/agent-ui/commands';
import type { BookingSummary, UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

// Shared placeholder detail content, reused by every sample cabin until the
// agent sends per-cabin content.
const cabinDetail: Cabin['detail'] = {
  gallery: ['/cabin-modal/1.png', '/cabin-modal/2.png', '/cabin-modal/3.png', '/cabin-modal/4.png'],
  bedroom: [
    'King-size bed (convertible to two twin beds)',
    'King-size pillows and Superior Cotton linens',
    'Beds face forward',
  ],
  bathroom: [
    'Single vanity',
    'Glass-enclosed shower with overhead and handheld showerhead',
    'Luxurious terry robes, slippers and upscale amenities',
    '220V power',
    'Hairdryer',
  ],
  amenities: [
    'Bedside table with convenient iPad',
    'Closet with shelving and full-height hanging',
    'In-suite safe',
    'Writing desk/vanity area',
    '40" wall-mounted flat-screen HD TV',
    'Refrigerator',
    'Nespresso coffee machine',
    'Adjustable height/extendable coffee/dining table',
    'Sofa',
    'French Balcony',
  ],
};

const sampleCabins: Cabin[] = [
  { id: 'owners-suite', name: "Owner's Suite", image: '/cabin/1.png' },
  { id: 'mozart-suite', name: 'Mozart Suite', image: '/cabin/2.png' },
  { id: 'penthouse-suite', name: 'Penthouse Suite', image: '/cabin/3.png' },
  { id: 'riverside-suite', name: 'Riverside Suite', image: '/cabin/4.png' },
  { id: 'symphony-suite', name: 'Symphony Suite', image: '/cabin/5.png' },
  { id: 'harmony-suite', name: 'Harmony Suite', image: '/cabin/6.png' },
].map((c) => ({
  ...c,
  guests: 2,
  area: 80,
  price_from: 12229,
  view: 'Balcony',
  detail: cabinDetail,
}));

const danubeLegends = {
  id: 'danube_legends_from_budapest_to_vienna',
  name: 'Danube Legends from Budapest to Vienna',
  duration: { days: 12, nights: 11 },
  match_score: 0.6667,
  departure_dates: ['2026-04-22', '2026-05-06', '2026-05-20', '2026-09-02', '2026-09-16'],
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
      experiences: [
        {
          id: 'signature_hungary_national_day',
          name: 'Signature Hungary: National Day Celebration',
          type: 'national_day_fireworks_event',
          venue: null,
          description:
            'Hungary National Day celebration with food, drinks, music and fireworks views from Vista Deck.',
        },
        {
          id: 'signature_budapest_horse_railway',
          name: 'Signature Budapest: Private Concert at Horse Railway Cultural Center',
          type: 'private_concert',
          venue: 'Horse Railway Cultural Center',
          description:
            "Private performance with champagne and hors d'oeuvres at reconstructed Zugliget Horse Railway terminal.",
        },
        {
          id: 'signature_budapest_wenckheim_palace',
          name: 'Signature Budapest: Private Concert at Wenckheim Palace',
          type: 'private_concert',
          venue: 'Wenckheim Palace',
          description:
            "Private concert at Neo-Baroque Wenckheim Palace in Budapest's Palace Quarter.",
        },
      ],
    },
    {
      id: 'bratislava',
      name: 'Bratislava',
      country: 'Slovakia',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 3 & 8',
      lon: 17.1077,
      lat: 48.1486,
    },
    {
      id: 'tulln',
      name: 'Tulln',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 4 & 9',
      lon: 16.05,
      lat: 48.33,
    },
    {
      id: 'wachau_valley',
      name: 'Wachau Valley',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
      days: 'Days 4 & 9',
      lon: 15.33,
      lat: 48.35,
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
      experiences: [
        {
          id: 'signature_vienna_belvedere_palace',
          name: 'Signature Vienna: VIP Evening at Belvedere Palace',
          type: 'private_concert_and_museum_visit',
          venue: 'Belvedere Palace',
          description:
            'After-hours or VIP-style experience at Belvedere Palace with palace visit, art viewing and private Mozart/Strauss concert.',
        },
      ],
    },
    {
      id: 'durnstein',
      name: 'Dürnstein',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Day 12',
      lon: 15.52,
      lat: 48.395,
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
    {
      id: 'default',
      label: 'All cabins',
      view: { type: 'cabin_selection', cabins: sampleCabins },
    },
    {
      id: 'with_detail',
      label: "Detail open (Owner's Suite)",
      view: { type: 'cabin_selection', cabins: sampleCabins, detailCabinId: 'owners-suite' },
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
