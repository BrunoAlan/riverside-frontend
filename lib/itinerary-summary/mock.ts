import type { Cabin } from '@/lib/agent-ui/commands';
import type { ItinerarySummary } from './types';

const CLOUD = 'https://res.cloudinary.com/dxcabwnx7/image/upload';
const BUDAPEST = `${CLOUD}/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg`;
const VIENNA = `${CLOUD}/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg`;
const WACHAU = `${CLOUD}/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg`;

const ownersSuite: Cabin = {
  id: 'owners-suite',
  name: "Owner's Suite",
  image: '/cabin/1.png',
  guests: 2,
  area: 80,
  price_from: 12229,
  view: 'Balcony',
  detail: {
    gallery: [
      '/cabin-modal/1.png',
      '/cabin-modal/2.png',
      '/cabin-modal/3.png',
      '/cabin-modal/4.png',
    ],
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
  },
};

export const ITINERARY_SUMMARY_MOCK: ItinerarySummary = {
  header: {
    title: 'Danube Serenade: Iconic Capitals & Wachau Valley',
    subtitle: "Claire & David's anniversary cruise",
    image: BUDAPEST,
  },
  details: {
    guests: '2 people',
    month: 'September',
    embarkation: 'Vienna',
    stops: 'Budapest +3',
    dates: '20 – 27 Sep 2026',
    pricePerPerson: '€ 9,174 p.p.',
    cabinName: "Owner's Suite",
  },
  cabin: ownersSuite,
  package: {
    pricePerPerson: '€ 9,174 p.p.',
    name: 'Premium All Inclusive Including Excursions',
    inclusions: [
      'Free Wifi',
      'Cakes, Waffles & Ice Cream',
      'Pre-selected Excursions for each port',
      'Minibar',
      '24h Roomservice',
      'Premium Wine, Cocktails, Spirits and French Champagne',
      'Dinner in "The Atelier" Included',
    ],
  },
  itinerary: {
    title: 'Vienna – Vienna',
    countries: ['Austria', 'Hungary', 'Slovakia'],
    description:
      'In one week, explore Riverside luxury along the Danube, visiting Vienna, Bratislava, and Budapest. Discover Esztergom’s historic Castle Hill and the ancient town of Tulln. End with the scenic Wachau Valley, known for its wines.',
    cities: [
      {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        days: 'Days 1, 2 & 8',
        image: VIENNA,
      },
      {
        id: 'bratislava',
        name: 'Bratislava',
        country: 'Slovakia',
        days: 'Day 3',
        image: BUDAPEST,
      },
      {
        id: 'budapest',
        name: 'Budapest',
        country: 'Hungary',
        days: 'Days 4 & 5',
        image: BUDAPEST,
      },
      {
        id: 'wachau_valley',
        name: 'Wachau Valley',
        country: 'Austria',
        days: 'Days 6 & 7',
        image: WACHAU,
      },
    ],
  },
  total: '€ 27,240',
};
