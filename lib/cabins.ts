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
    image: '/cabin/1.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'mozart-suite',
    name: 'Mozart Suite',
    image: '/cabin/2.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'penthouse-suite',
    name: 'Penthouse Suite',
    image: '/cabin/3.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'riverside-suite',
    name: 'Riverside Suite',
    image: '/cabin/4.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'symphony-suite',
    name: 'Symphony Suite',
    image: '/cabin/5.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
  {
    id: 'harmony-suite',
    name: 'Harmony Suite',
    image: '/cabin/6.png',
    guests: 2,
    area: 80,
    priceFrom: 12229,
    view: 'Balcony',
  },
];

/** Formats a EUR amount with thousands separators, e.g. 12229 -> "12,229". */
export function formatCabinPrice(price: number): string {
  return new Intl.NumberFormat('en-US').format(price);
}
