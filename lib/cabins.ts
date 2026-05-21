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

/**
 * Shared placeholder detail content shown in the cabin detail modal.
 * Reused by every cabin until per-cabin content exists.
 */
export const CABIN_DETAIL = {
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
} as const;
