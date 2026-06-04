# Itinerary Summary Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing "Itinerary Summary" button in the booking summary bar open a full-screen, fully-mocked modal showing header, booking details, selected cabin, day-by-day itinerary, package, and total with CTAs.

**Architecture:** Local `useState` in `booking-summary.tsx` toggles a self-contained `ItinerarySummaryModal`. The modal is a custom full-viewport Radix dialog (`@radix-ui/react-dialog` primitives directly, matching `cabin-detail-modal.tsx`) composing focused leaf components. All content comes from one typed mock (`ITINERARY_SUMMARY_MOCK`). No `uiViewStore`, view-registry, or command changes — swapping in an agent payload later is a data change only.

**Tech Stack:** Next.js (App Router, RSC + `'use client'`), React 19, TypeScript (strict), Tailwind + `cn()`, Radix Dialog, `next/image`, lucide-react / @phosphor-icons, Zod-inferred `Cabin` type. Vitest for `lib/` logic only.

---

## Testing note (deviation from spec)

The design spec proposed a co-located React component smoke test. The repo convention
(`conventions/testing.md`) **overrides** this: only `lib/**/*.test.ts` is collected by Vitest and
"React components → No → Verified visually via the dev panel." There is also no pure logic to test
here (the mock is static data). Therefore **this plan adds no automated component test.** The
verification gates are:

- `pnpm lint` — ESLint clean (run per task).
- `pnpm test` — existing `lib/` suite stays green (final task).
- `pnpm build` — Next.js typecheck passes (final task).
- Manual dev-panel walkthrough checklist (final task) — run by the user.

## File structure

| File | Responsibility |
| --- | --- |
| `lib/itinerary-summary/types.ts` (create) | `ItinerarySummary`, `SummaryItineraryCity` types |
| `lib/itinerary-summary/mock.ts` (create) | `ITINERARY_SUMMARY_MOCK` |
| `components/panels/cabin/cabin-detail-section.tsx` (create) | Shared `DetailSection` (extracted) |
| `components/panels/cabin/cabin-detail-modal.tsx` (modify) | Import `DetailSection` from new file |
| `components/panels/itinerary-summary/summary-header.tsx` (create) | Header image block |
| `components/panels/itinerary-summary/summary-details-row.tsx` (create) | Icon chip row |
| `components/panels/itinerary-summary/summary-cabin-card.tsx` (create) | Gallery + meta + detail sections |
| `components/panels/itinerary-summary/summary-package-card.tsx` (create) | Package card |
| `components/panels/itinerary-summary/summary-city-card.tsx` (create) | One itinerary city card |
| `components/panels/itinerary-summary/summary-itinerary-column.tsx` (create) | Itinerary header + city list |
| `components/panels/itinerary-summary/summary-footer-bar.tsx` (create) | Total + CTAs |
| `components/panels/itinerary-summary/itinerary-summary-modal.tsx` (create) | Dialog shell + composition |
| `components/agent-ui/booking-summary.tsx` (modify) | Wire button → open modal |

---

## Task 1: Data layer (types + mock)

**Files:**
- Create: `lib/itinerary-summary/types.ts`
- Create: `lib/itinerary-summary/mock.ts`

- [ ] **Step 1: Create the types**

`lib/itinerary-summary/types.ts`:

```ts
import type { Cabin } from '@/lib/agent-ui/commands';

export type SummaryAddOn = {
  label: string; // e.g. "Add-On"
  day: string; // e.g. "Day 1"
  description: string;
};

export type SummaryItineraryCity = {
  id: string;
  name: string;
  country: string;
  days: string; // "Days 1, 2 & 8"
  image: string;
  addOns?: SummaryAddOn[];
};

export type ItinerarySummaryDetails = {
  guests: string; // "2 people"
  month: string; // "September"
  embarkation: string; // "Vienna"
  stops: string; // "Budapest +3"
  dates: string; // "20 – 27 Sep 2026"
  pricePerPerson: string; // "€ 9,174 p.p."
  dietary: string; // "Dietary Accommodation"
  cabinName: string; // "Owner's Suite"
};

export type ItinerarySummaryPackage = {
  pricePerPerson: string; // "€ 9,174 p.p."
  name: string; // "Premium All Inclusive Including Excursions"
  inclusions: string[];
};

export type ItinerarySummary = {
  header: { title: string; subtitle: string; image: string };
  details: ItinerarySummaryDetails;
  cabin: Cabin;
  package: ItinerarySummaryPackage;
  itinerary: {
    title: string; // "Vienna – Vienna"
    countries: string[]; // ["Austria", "Hungary", "Slovakia"]
    description: string;
    cities: SummaryItineraryCity[];
  };
  total: string; // "€ 27,240"
};
```

- [ ] **Step 2: Create the mock**

`lib/itinerary-summary/mock.ts`:

```ts
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
    dietary: 'Dietary Accommodation',
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
      'Premium Wine, Cocktails, Spirits and French Champange',
      'Dinner in “The Atelier” Included',
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
        addOns: [
          {
            label: 'Add-On',
            day: 'Day 1',
            description: 'A private evening of chamber music at Palais Eschenbach.',
          },
        ],
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
        addOns: [
          {
            label: 'Add-On',
            day: 'Day 4',
            description: 'Private concert at the Wenckheim Palace with champagne reception.',
          },
        ],
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
```

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/itinerary-summary/types.ts lib/itinerary-summary/mock.ts
git commit -m "feat(itinerary-summary): add mock data layer"
```

---

## Task 2: Extract shared DetailSection

**Files:**
- Create: `components/panels/cabin/cabin-detail-section.tsx`
- Modify: `components/panels/cabin/cabin-detail-modal.tsx`

- [ ] **Step 1: Create the extracted component**

`components/panels/cabin/cabin-detail-section.tsx`:

```tsx
import type { BedIcon } from '@phosphor-icons/react';

export function DetailSection({
  icon: SectionIcon,
  title,
  items,
}: {
  icon: typeof BedIcon;
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 pb-2">
        <SectionIcon className="text-neutral-700" size={20} />
        <h3 className="font-display text-lg font-semibold text-neutral-700">{title}</h3>
      </div>
      <ul className="border-border border-t">
        {items.map((item) => (
          <li key={item} className="border-border text-muted-foreground border-b py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Repoint the cabin modal**

In `components/panels/cabin/cabin-detail-modal.tsx`, remove the local `DetailSection` function (lines 16-40) and import it instead. The top of the file becomes:

```tsx
import { ArmchairIcon, BathtubIcon, BedIcon, XIcon } from '@phosphor-icons/react';
// Radix dialog primitives directly, not the shadcn Dialog wrapper: that wrapper
// hardcodes a fixed, body-portaled, viewport-wide overlay. This detail view must
// stay confined to the cabin panel, so it renders inline (no Portal) with
// modal={false} — keeping the bottom bar and voice input interactive.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
};
```

The rest of the file (the `CabinDetailModal` function from its `export function` onward) is unchanged — it already references `DetailSection` and `BedIcon`/`BathtubIcon`/`ArmchairIcon`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors (no unused-import or no-undef warnings).

- [ ] **Step 4: Commit**

```bash
git add components/panels/cabin/cabin-detail-section.tsx components/panels/cabin/cabin-detail-modal.tsx
git commit -m "refactor(cabin): extract DetailSection into its own file"
```

---

## Task 3: Header block

**Files:**
- Create: `components/panels/itinerary-summary/summary-header.tsx`

- [ ] **Step 1: Create the component**

`components/panels/itinerary-summary/summary-header.tsx`:

```tsx
import Image from 'next/image';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryHeader({ header }: { header: ItinerarySummary['header'] }) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
      <Image
        src={header.image}
        alt={header.title}
        fill
        sizes="(min-width: 1280px) 1216px, 100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute right-6 bottom-6 left-6 text-white">
        <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
          {header.title}
        </h2>
        <p className="mt-2 text-base text-white/85 sm:text-lg">{header.subtitle}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-header.tsx
git commit -m "feat(itinerary-summary): add header block"
```

---

## Task 4: Details chip row

**Files:**
- Create: `components/panels/itinerary-summary/summary-details-row.tsx`

- [ ] **Step 1: Create the component**

`components/panels/itinerary-summary/summary-details-row.tsx`:

```tsx
import {
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Euro,
  MapPin,
  Users,
  Utensils,
} from 'lucide-react';
import type { ItinerarySummaryDetails } from '@/lib/itinerary-summary/types';

export function SummaryDetailsRow({ details }: { details: ItinerarySummaryDetails }) {
  const fields: { icon: React.ReactNode; label: string }[] = [
    { icon: <Users className="size-4" />, label: details.guests },
    { icon: <CalendarDays className="size-4" />, label: details.month },
    { icon: <MapPin className="size-4" />, label: details.embarkation },
    { icon: <BookOpen className="size-4" />, label: details.stops },
    { icon: <CalendarRange className="size-4" />, label: details.dates },
    { icon: <Euro className="size-4" />, label: details.pricePerPerson },
    { icon: <Utensils className="size-4" />, label: details.dietary },
    { icon: <BedDouble className="size-4" />, label: details.cabinName },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {fields.map((field, i) => (
        <span key={i} className="text-foreground inline-flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{field.icon}</span>
          {field.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-details-row.tsx
git commit -m "feat(itinerary-summary): add details chip row"
```

---

## Task 5: Cabin card

**Files:**
- Create: `components/panels/itinerary-summary/summary-cabin-card.tsx`

- [ ] **Step 1: Create the component**

`components/panels/itinerary-summary/summary-cabin-card.tsx`:

```tsx
import { ArmchairIcon, BathtubIcon, BedIcon } from '@phosphor-icons/react';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

export function SummaryCabinCard({ cabin }: { cabin: Cabin }) {
  const meta = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.price_from)} EUR`,
    cabin.view,
  ];

  return (
    <div className="bg-beige-50 flex flex-col overflow-hidden rounded-2xl">
      <div className="h-72 sm:h-80">
        <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
      </div>
      <div className="flex flex-col gap-6 p-6 pt-2">
        <div>
          <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {cabin.name}
          </h3>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {meta.map((item, index) => (
              <span key={index} className="flex items-center gap-3">
                {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
          <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
          <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-cabin-card.tsx
git commit -m "feat(itinerary-summary): add cabin card"
```

---

## Task 6: Package card

**Files:**
- Create: `components/panels/itinerary-summary/summary-package-card.tsx`

- [ ] **Step 1: Create the component**

`components/panels/itinerary-summary/summary-package-card.tsx`:

```tsx
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ItinerarySummaryPackage } from '@/lib/itinerary-summary/types';

export function SummaryPackageCard({ pkg }: { pkg: ItinerarySummaryPackage }) {
  return (
    <div className="bg-beige-50 flex flex-col gap-5 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-neutral-700">Package</h3>
        <Button variant="link" size="sm" className="gap-1 px-0">
          Change package
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="border-border rounded-2xl border p-5">
        <div className="flex items-center gap-2">
          <span className="bg-primary size-2.5 rounded-full" aria-hidden />
          <span className="text-foreground text-sm">{pkg.pricePerPerson}</span>
        </div>
        <p className="font-display mt-4 text-2xl leading-snug font-semibold text-neutral-700">
          {pkg.name}
        </p>
        <ul className="mt-4 border-t border-border">
          {pkg.inclusions.map((item) => (
            <li
              key={item}
              className="border-border text-muted-foreground border-b py-3 text-sm last:border-b-0"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-package-card.tsx
git commit -m "feat(itinerary-summary): add package card"
```

---

## Task 7: Itinerary column (city card + column)

**Files:**
- Create: `components/panels/itinerary-summary/summary-city-card.tsx`
- Create: `components/panels/itinerary-summary/summary-itinerary-column.tsx`

- [ ] **Step 1: Create the city card**

`components/panels/itinerary-summary/summary-city-card.tsx`:

```tsx
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import type { SummaryItineraryCity } from '@/lib/itinerary-summary/types';

export function SummaryCityCard({ city }: { city: SummaryItineraryCity }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-60 w-full overflow-hidden rounded-2xl">
        <Image
          src={city.image}
          alt={city.name}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {city.name}
          </h4>
          <p className="text-muted-foreground mt-1 text-base">{city.country}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="bg-beige-200 text-primary rounded-md px-3 py-1 text-sm whitespace-nowrap">
            {city.days}
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            More information
            <ChevronDown className="size-4" />
          </span>
        </div>
      </div>
      {city.addOns?.map((addOn, i) => (
        <div key={i} className="bg-beige-100 rounded-xl p-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs tracking-wide uppercase">
            <span>{addOn.label}</span>
            <span>{addOn.day}</span>
          </div>
          <p className="text-foreground mt-2 text-sm">{addOn.description}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the column**

`components/panels/itinerary-summary/summary-itinerary-column.tsx`:

```tsx
import { Fragment } from 'react';
import { SummaryCityCard } from '@/components/panels/itinerary-summary/summary-city-card';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryItineraryColumn({
  itinerary,
}: {
  itinerary: ItinerarySummary['itinerary'];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
          {itinerary.title}
        </h3>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 text-sm">
          {itinerary.countries.map((country, i) => (
            <Fragment key={country}>
              {i > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
              <span>{country}</span>
            </Fragment>
          ))}
        </div>
        <p className="text-foreground mt-4 text-base leading-relaxed">{itinerary.description}</p>
      </div>
      <div className="flex flex-col gap-8">
        {itinerary.cities.map((city) => (
          <SummaryCityCard key={city.id} city={city} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary-summary/summary-city-card.tsx components/panels/itinerary-summary/summary-itinerary-column.tsx
git commit -m "feat(itinerary-summary): add itinerary column and city card"
```

---

## Task 8: Footer bar

**Files:**
- Create: `components/panels/itinerary-summary/summary-footer-bar.tsx`

- [ ] **Step 1: Create the component**

`components/panels/itinerary-summary/summary-footer-bar.tsx`:

```tsx
import { Button } from '@/components/ui/button';

export function SummaryFooterBar({ total }: { total: string }) {
  return (
    <div className="bg-beige-100/95 sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t px-4 py-4 backdrop-blur sm:px-6">
      <p className="font-display text-2xl font-semibold text-neutral-700">Total: {total}</p>
      <div className="flex items-center gap-3">
        <Button variant="secondary">Talk to a Riverside Specialist</Button>
        <Button>Continue to booking</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-footer-bar.tsx
git commit -m "feat(itinerary-summary): add footer bar"
```

---

## Task 9: Modal shell

**Files:**
- Create: `components/panels/itinerary-summary/itinerary-summary-modal.tsx`

- [ ] **Step 1: Create the modal shell**

`components/panels/itinerary-summary/itinerary-summary-modal.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { Save, Share, X } from 'lucide-react';
// Radix dialog primitives directly (matching cabin-detail-modal): the shadcn
// Dialog wrapper hardcodes a centered max-w-lg panel with a baked-in close
// button. This modal is a full-viewport takeover with its own chrome.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { SummaryCabinCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SummaryDetailsRow } from '@/components/panels/itinerary-summary/summary-details-row';
import { SummaryFooterBar } from '@/components/panels/itinerary-summary/summary-footer-bar';
import { SummaryHeader } from '@/components/panels/itinerary-summary/summary-header';
import { SummaryItineraryColumn } from '@/components/panels/itinerary-summary/summary-itinerary-column';
import { SummaryPackageCard } from '@/components/panels/itinerary-summary/summary-package-card';
import { Button } from '@/components/ui/button';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

type ItinerarySummaryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ItinerarySummary;
};

export function ItinerarySummaryModal({ open, onOpenChange, data }: ItinerarySummaryModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex justify-center overflow-y-auto p-3 outline-none sm:p-6"
        >
          <div className="bg-beige-100 relative my-auto flex w-full max-w-[1280px] flex-col rounded-3xl shadow-xl">
            {/* Top bar */}
            <div className="bg-beige-100/95 sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2">
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary" size="icon-sm" aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </DialogPrimitive.Close>
                <Button variant="secondary" size="icon-sm" aria-label="Share">
                  <Share className="size-4" />
                </Button>
                <Button variant="secondary" size="icon-sm" aria-label="Save">
                  <Save className="size-4" />
                </Button>
              </div>
              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 sm:block">
                <Image src="/riverside-logo.svg" alt="Riverside" width={64} height={48} priority />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="hidden sm:inline-flex">
                  Talk to a Riverside Specialist
                </Button>
                <Button>Continue to booking</Button>
              </div>
            </div>

            <DialogPrimitive.Title className="sr-only">{data.header.title}</DialogPrimitive.Title>

            {/* Body */}
            <div className="flex flex-col gap-8 px-4 pb-8 sm:px-6">
              <SummaryHeader header={data.header} />
              <SummaryDetailsRow details={data.details} />
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="flex flex-col gap-8">
                  <SummaryCabinCard cabin={data.cabin} />
                  <SummaryPackageCard pkg={data.package} />
                </div>
                <SummaryItineraryColumn itinerary={data.itinerary} />
              </div>
            </div>

            <SummaryFooterBar total={data.total} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/itinerary-summary-modal.tsx
git commit -m "feat(itinerary-summary): add modal shell"
```

---

## Task 10: Wire the button

**Files:**
- Modify: `components/agent-ui/booking-summary.tsx`

- [ ] **Step 1: Add imports and state, render the modal**

In `components/agent-ui/booking-summary.tsx`:

1. Add to the top of the file (with the other imports):

```tsx
import { useState } from 'react';
import { ItinerarySummaryModal } from '@/components/panels/itinerary-summary/itinerary-summary-modal';
import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
```

2. Add `'use client';` is already present at line 1 — leave it.

3. Inside `BookingSummary`, add state at the top of the function body (before `const stopsLabel`):

```tsx
const [summaryOpen, setSummaryOpen] = useState(false);
```

4. Give the existing button an `onClick` (replace the button at lines 111-114):

```tsx
<Button
  variant="secondary"
  size="sm"
  className="gap-2"
  onClick={() => setSummaryOpen(true)}
>
  <Maximize2 className="size-3.5" />
  Itinerary Summary
</Button>
```

5. Render the modal just before the final closing `</div>` of the returned JSX (after the second row `<div className="flex flex-wrap items-center justify-between gap-3"> ... </div>` block, still inside the outer container div):

```tsx
<ItinerarySummaryModal
  open={summaryOpen}
  onOpenChange={setSummaryOpen}
  data={ITINERARY_SUMMARY_MOCK}
/>
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/booking-summary.tsx
git commit -m "feat(itinerary-summary): open modal from booking summary button"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck via build**

Run: `pnpm build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 2: Existing test suite stays green**

Run: `pnpm test`
Expected: all existing `lib/` tests pass.

- [ ] **Step 3: Lint the whole project**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual dev-panel walkthrough (run by the user)**

```bash
pnpm dev
```

Then in the browser:
1. Click the **dev** button to open the dev panel.
2. Set the view to **itinerary → Danube Legends** (so the canvas is non-`start`).
3. Set the **booking summary** mock to **Full (matches Figma)** so the bottom bar with the
   "Itinerary Summary" button appears.
4. Click **Itinerary Summary**. Confirm:
   - Full-screen modal opens over the app with the beige rounded panel.
   - Header image shows the title + subtitle.
   - Details chip row shows all 8 fields.
   - Left column shows the Owner's Suite cabin (gallery + Bedroom/Bathroom/Amenities) and the
     Package card below.
   - Right column shows "Vienna – Vienna", country pills, description, and the city cards with the
     Add-On rows.
   - Sticky footer shows `Total: € 27,240` and the two CTAs.
   - The `X` button (and `Esc`) closes the modal.
   - Narrowing the window collapses the two columns into one.

- [ ] **Step 5: No commit needed** (verification only). If any step fails, fix the relevant task's file and re-run that task's lint/commit before re-verifying.

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** trigger (Task 10), modal shell (Task 9), header (Task 3), details row (Task 4),
  cabin card (Task 5), package card (Task 6), itinerary column (Task 7), footer (Task 8), data model
  (Task 1), reuse refactor (Task 2), verification (Task 11). All spec sections mapped.
- **Testing deviation:** documented above — repo convention overrides the spec's component-test
  proposal.
- **Type consistency:** `ItinerarySummary` shape in Task 1 matches every consumer
  (`header`/`details`/`cabin`/`package`/`itinerary`/`total`); `SummaryItineraryCity` fields
  (`name`/`country`/`days`/`image`/`addOns`) match `summary-city-card.tsx`; `DetailSection` props
  (`icon`/`title`/`items`) match both consumers.
- **Placeholder scan:** no TBD/TODO; every code step contains complete code.
```
