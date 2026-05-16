export type City = {
  id: string;
  name: string;
  country: string;
  image: string;
  days: string;
  lon: number;
  lat: number;
};

export const cities: City[] = [
  {
    id: 'vienna',
    name: 'Vienna',
    country: 'Austria',
    image: '/map/viena.png',
    days: 'Days 1, 2 & 8',
    lon: 16.3738,
    lat: 48.2082,
  },
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovakia',
    image: '/map/bratislava.png',
    days: 'Days 3 & 4',
    lon: 17.1077,
    lat: 48.1486,
  },
  {
    id: 'wachau-valley',
    name: 'Wachau Valley',
    country: 'Austria',
    image: '/map/Wachau Valley.png',
    days: 'Days 5, 6 & 7',
    lon: 15.4214,
    lat: 48.3797,
  },
];
