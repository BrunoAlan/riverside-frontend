import type { Cabin, UiCommand } from '@/lib/agent-ui/commands';
import type {
  BookingSummary,
  PackageCell,
  PackageFeature,
  PackageOption,
  UiView,
} from '@/lib/agent-ui/ui-view-types';
import { makeBookingForm } from '@/lib/booking-form/guests';
import { BOOKING_FORM_MOCK } from '@/lib/booking-form/mock';
import type { BookingForm } from '@/lib/booking-form/types';
import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';
import type { SuggestionPill } from '@/lib/suggestions/pills';

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
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
          ],
        },
        {
          id: 'signature_budapest_horse_railway',
          name: 'Signature Budapest: Private Concert at Horse Railway Cultural Center',
          type: 'private_concert',
          venue: 'Horse Railway Cultural Center',
          description:
            "Private performance with champagne and hors d'oeuvres at reconstructed Zugliget Horse Railway terminal.",
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
          ],
        },
        {
          id: 'signature_budapest_wenckheim_palace',
          name: 'Signature Budapest: Private Concert at Wenckheim Palace',
          type: 'private_concert',
          venue: 'Wenckheim Palace',
          description:
            "Private concert at Neo-Baroque Wenckheim Palace in Budapest's Palace Quarter.",
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
          ],
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
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
          ],
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

// Singletons are safe: PackageCell is read-only in the UI layer.
const inc: PackageCell = { kind: 'included' };
const exc: PackageCell = { kind: 'excluded' };
const txt = (text: string): PackageCell => ({ kind: 'text', text });

const packageFeatures: PackageFeature[] = [
  { id: 'wifi', label: 'Wifi' },
  { id: 'cakes', label: 'Cakes, Waffles & Ice Cream' },
  { id: 'excursions', label: 'Pre-selected Excursions' },
  { id: 'minibar', label: 'Minibar' },
  { id: 'room_service', label: 'Room Service' },
  { id: 'welcome_package', label: 'Welcome package' },
  { id: 'dinner_atelier', label: 'Dinner in "The Atelier"' },
];

const premiumWelcome = 'Premium Wine, Cocktails, Spirits and French Champagne';
const fullBoardWelcome = 'Water, Coffee and Tea during meals';
const limitedRoomService = 'During opening hours & According to the menu';

const samplePackages: PackageOption[] = [
  {
    id: 'premium_all_inclusive_excursions',
    name: 'Premium All Inclusive Including Excursions',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: inc,
      room_service: txt('24h'),
      welcome_package: txt(premiumWelcome),
      dinner_atelier: inc,
    },
  },
  {
    id: 'full_board_excursions',
    name: 'Full Board Including Excursions',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: exc,
      room_service: txt(limitedRoomService),
      welcome_package: txt(fullBoardWelcome),
      dinner_atelier: txt('€40,- p.p. cover charge applies'),
    },
  },
  {
    id: 'premium_all_inclusive',
    name: 'Premium All Inclusive',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: inc,
      room_service: txt('24h'),
      welcome_package: txt(premiumWelcome),
      dinner_atelier: inc,
    },
  },
  {
    id: 'full_board',
    name: 'Full Board',
    price: 8850,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: exc,
      room_service: txt(limitedRoomService),
      welcome_package: txt(fullBoardWelcome),
      dinner_atelier: txt('€25,- p.p. cover charge applies'),
    },
  },
];

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
      view: { type: 'itinerary', itinerary: danubeLegends },
    },
    {
      id: 'danube_legends_detail',
      label: 'Detail open (Vienna)',
      view: {
        type: 'itinerary',
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
  package_selection: [
    {
      id: 'default',
      label: 'Four boards (matches Figma)',
      view: { type: 'package_selection', features: packageFeatures, packages: samplePackages },
    },
    {
      id: 'two_packages',
      label: 'Two boards',
      view: {
        type: 'package_selection',
        features: packageFeatures,
        packages: samplePackages.slice(0, 2),
      },
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

export interface ItinerarySummaryMock {
  id: string;
  label: string;
  summary: ItinerarySummary | null;
}

const EMPTY_ITINERARY_SUMMARY: ItinerarySummary = {
  header: { title: 'Your itinerary', subtitle: null, image: null },
  details: {
    guests: null,
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
};

export const ITINERARY_SUMMARY_MOCKS: readonly ItinerarySummaryMock[] = [
  { id: 'clear', label: 'Closed (null)', summary: null },
  { id: 'empty', label: 'All placeholders', summary: EMPTY_ITINERARY_SUMMARY },
  { id: 'full', label: 'Full', summary: ITINERARY_SUMMARY_MOCK },
];

export interface SyncExperiencesMock {
  id: string;
  label: string;
  command: Extract<UiCommand, { type: 'sync_itinerary_experiences' }>;
}

const syncCommand = (
  id: string,
  experiences: Array<{ experience_id: string; name: string; day: string }>
): SyncExperiencesMock['command'] => ({
  type: 'sync_itinerary_experiences',
  correlationId: `dev-${id}`,
  payload: {
    experiences: experiences.map((e) => ({ ...e, destination: '', passenger_count: 2 })),
  },
});

export const SYNC_EXPERIENCES_MOCKS: readonly SyncExperiencesMock[] = [
  {
    id: 'belvedere',
    label: 'Belvedere · Day 5',
    command: syncCommand('belvedere', [
      {
        experience_id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        day: 'Day 5',
      },
    ]),
  },
  {
    id: 'belvedere_wenckheim',
    label: 'Belvedere · Day 5 + Wenckheim · Day 2',
    command: syncCommand('belvedere_wenckheim', [
      {
        experience_id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        day: 'Day 5',
      },
      {
        experience_id: 'signature_budapest_wenckheim_palace',
        name: 'Signature Budapest: Private Concert at Wenckheim Palace',
        day: 'Day 2',
      },
    ]),
  },
];

export interface AgentSuggestionsMock {
  id: string;
  label: string;
  /** `null` clears the override, hiding the row. */
  pills: SuggestionPill[] | null;
}

export const AGENT_SUGGESTIONS_MOCKS: readonly AgentSuggestionsMock[] = [
  {
    id: 'itinerary_specific',
    label: 'Itinerary-specific (Danube Legends)',
    pills: [
      {
        id: 'sug-budapest',
        label: 'What can I do in Budapest?',
        message: 'What can I do in Budapest?',
      },
      {
        id: 'sug-belvedere',
        label: 'The Belvedere evening?',
        message: 'Tell me more about the VIP evening at Belvedere Palace',
      },
      {
        id: 'sug-day5',
        label: "What's on day 5?",
        message: 'What is planned for day 5 of my itinerary?',
      },
    ],
  },
  {
    id: 'overflow',
    label: 'Seven pills (render caps at 6)',
    pills: Array.from({ length: 7 }, (_, i) => ({
      id: `sug-${i + 1}`,
      label: `Suggestion ${i + 1}`,
      message: `Suggestion ${i + 1}`,
    })),
  },
  { id: 'clear', label: 'Clear (hide row)', pills: null },
];

export interface BookingFormMock {
  id: string;
  label: string;
  form: BookingForm | null;
}

export const BOOKING_FORM_MOCKS: readonly BookingFormMock[] = [
  { id: 'clear', label: 'Closed (null)', form: null },
  { id: 'full', label: 'Full (2 guests)', form: BOOKING_FORM_MOCK },
  {
    id: 'single_empty',
    label: '1 guest, empty summary',
    form: makeBookingForm(EMPTY_ITINERARY_SUMMARY, 1),
  },
];
