export type Cabin = {
  id: string;
  name: string;
  image: string;
  guests: number;
  area: number;
  priceFrom: number;
  view: string;
};

export const cabins: Cabin[] = [
  {
    id: 'owners-suite',
    name: "Owner's Suite",
    image: '/cabins/owners-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'mozart-suite',
    name: 'Mozart Suite',
    image: '/cabins/mozart-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'penthouse-suite',
    name: 'Penthouse Suite',
    image: '/cabins/penthouse-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'riverside-suite',
    name: 'Riverside Suite',
    image: '/cabins/riverside-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'symphony-suite',
    name: 'Symphony Suite',
    image: '/cabins/symphony-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'harmony-suite',
    name: 'Harmony Suite',
    image: '/cabins/harmony-suite.jpg',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
];

/** Formats a EUR amount with thousands separators, e.g. 12229 -> "12,229". */
export function formatCabinPrice(price: number): string {
  return price.toLocaleString('en-US');
}
