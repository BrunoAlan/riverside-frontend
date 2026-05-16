import type { City } from '@/lib/map/cities';

export type Itinerary = {
  id: string;
  label: string;
  cities: City[];
  center: [number, number]; // [lon, lat]
  zoom: number;
};

const vienna: City = {
  id: 'vienna',
  name: 'Vienna',
  country: 'Austria',
  image: '/map/viena.png',
  days: 'Days 1, 2 & 8',
  lon: 16.3738,
  lat: 48.2082,
};

const bratislava: City = {
  id: 'bratislava',
  name: 'Bratislava',
  country: 'Slovakia',
  image: '/map/bratislava.png',
  days: 'Days 3 & 4',
  lon: 17.1077,
  lat: 48.1486,
};

const wachauValley: City = {
  id: 'wachau-valley',
  name: 'Wachau Valley',
  country: 'Austria',
  image: '/map/wachau-valley.png',
  days: 'Days 5, 6 & 7',
  lon: 15.4214,
  lat: 48.3797,
};

export const itineraries: Itinerary[] = [
  {
    id: 'danube-serenade',
    label: 'Danube Serenade',
    cities: [vienna, bratislava, wachauValley],
    center: [16.3, 48.25],
    zoom: 7.2,
  },
  {
    id: 'el-gran-danubio',
    label: 'El Gran Danubio',
    cities: [wachauValley, vienna],
    center: [15.9, 48.3],
    zoom: 7.4,
  },
];
