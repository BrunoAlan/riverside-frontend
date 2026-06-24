# Show Itinerary Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the Itinerary Summary modal from the agent round-trip — the button emits a `view_itinerary_summary` intent and the backend's `show_itinerary_summary` command fills a store slice that opens the modal, replacing the local mock; every section is nullable and renders a placeholder.

**Architecture:** New inbound command `show_itinerary_summary` (snake_case, fully nullable) parsed in `commands.ts`; reducer maps it to the internal camelCase `ItinerarySummary` and stores it in a new `itinerarySummary` slice. The modal mounts when the slice is non-null. Closing is purely local. Modal sub-components tolerate `null` with placeholders.

**Tech Stack:** TypeScript, Zod, Zustand, React, LiveKit, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-09-show-itinerary-summary-design.md`
**Contract:** `docs/contracts/show-itinerary-summary.md`

---

## File structure

- **Modify** `lib/agent-ui/commands.ts` — add `ItinerarySummaryWire` schema + `ShowItinerarySummary` command + union entry.
- **Modify** `lib/agent-ui/commands.test.ts` — schema tests.
- **Modify** `lib/itinerary-summary/types.ts` — make `ItinerarySummary` (and sub-types) nullable.
- **Create** `lib/itinerary-summary/from-wire.ts` — `toItinerarySummary` mapper (snake→camel, nulls through).
- **Create** `lib/itinerary-summary/from-wire.test.ts` — mapper tests.
- **Modify** `lib/agent-ui/ui-view-store.ts` — slice, reducer case, setters.
- **Modify** `lib/agent-ui/ui-view-store.test.ts` — reducer/setter tests.
- **Modify** `lib/agent-ui/hooks.ts` — new hooks.
- **Modify** the 6 modal sub-components in `components/panels/itinerary-summary/` — placeholder rendering for null.
- **Modify** `lib/itinerary-summary/copy.ts` — placeholder copy.
- **Modify** `components/agent-ui/booking-summary.tsx` — emit intent + render from store.
- **Modify** `lib/dev/mocks.ts` — `ITINERARY_SUMMARY_MOCKS` (full + empty).
- **Modify** `lib/dev/dev-panel.tsx` — dev control.
- **Modify** `conventions/frontend-intents.md` — document `view_itinerary_summary`.

---

## Task 1: Wire schema for `show_itinerary_summary`

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write failing tests**

Append inside the `describe('UiCommand schema', ...)` block in `lib/agent-ui/commands.test.ts`:

```ts
it('parses show_itinerary_summary with a full payload', () => {
  const result = UiCommand.parse({
    type: 'show_itinerary_summary',
    correlationId: 'c1',
    payload: {
      header: { title: 'Danube', subtitle: 'Anniversary', image: '/h.jpg' },
      details: {
        guests: '2 people',
        month: 'September',
        embarkation: 'Vienna',
        stops: 'Budapest +3',
        dates: '20 – 27 Sep 2026',
        price_per_person: '€ 9,174 p.p.',
        cabin_name: "Owner's Suite",
      },
      cabin: {
        id: 'owners-suite',
        name: "Owner's Suite",
        image: '/cabin/1.png',
        guests: 2,
        area: 80,
        price_from: 12229,
        view: 'Balcony',
        detail: { gallery: ['/g1.png'], bedroom: [], bathroom: [], amenities: [] },
      },
      package: {
        price_per_person: '€ 9,174 p.p.',
        name: 'Premium All Inclusive',
        inclusions: ['Free Wifi'],
      },
      itinerary: {
        title: 'Vienna – Vienna',
        countries: ['Austria'],
        description: 'A week on the Danube',
        cities: [
          { id: 'vienna', name: 'Vienna', country: 'Austria', days: 'Days 1, 2 & 8', image: '/v.jpg' },
        ],
      },
      total: '€ 27,240',
    },
  });
  if (result.type !== 'show_itinerary_summary') throw new Error('discriminator failed');
  expect(result.payload.cabin?.price_from).toBe(12229);
  expect(result.payload.details.cabin_name).toBe("Owner's Suite");
});

it('parses show_itinerary_summary with an all-null partial payload', () => {
  const result = UiCommand.parse({
    type: 'show_itinerary_summary',
    correlationId: 'c2',
    payload: {
      header: { title: null, subtitle: null, image: null },
      details: {
        guests: null,
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: null,
        cabin_name: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    },
  });
  if (result.type !== 'show_itinerary_summary') throw new Error('discriminator failed');
  expect(result.payload.cabin).toBeNull();
  expect(result.payload.total).toBeNull();
});

it('rejects show_itinerary_summary missing the details object', () => {
  const parsed = UiCommand.safeParse({
    type: 'show_itinerary_summary',
    correlationId: 'c3',
    payload: { header: { title: null, subtitle: null, image: null } },
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: FAIL — `show_itinerary_summary` not in the discriminated union (parse throws / safeParse for the full+partial cases fail).

- [ ] **Step 3: Add the schema and command**

In `lib/agent-ui/commands.ts`, after the `ShowExperienceDetail` block (before `AddCabinToBasket`), add:

```ts
const nstr = z.string().nullable();

export const ItinerarySummaryWire = z.object({
  header: z.object({ title: nstr, subtitle: nstr, image: nstr }),
  details: z.object({
    guests: nstr,
    month: nstr,
    embarkation: nstr,
    stops: nstr,
    dates: nstr,
    price_per_person: nstr,
    cabin_name: nstr,
  }),
  cabin: Cabin.nullable(),
  package: z
    .object({
      price_per_person: nstr,
      name: nstr,
      inclusions: z.array(z.string()),
    })
    .nullable(),
  itinerary: z
    .object({
      title: nstr,
      countries: z.array(z.string()),
      description: nstr,
      cities: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          country: z.string(),
          days: z.string(),
          image: z.string(),
        })
      ),
    })
    .nullable(),
  total: nstr,
});
export type ItinerarySummaryWire = z.infer<typeof ItinerarySummaryWire>;

const ShowItinerarySummary = Base.extend({
  type: z.literal('show_itinerary_summary'),
  payload: ItinerarySummaryWire,
});
```

Then add `ShowItinerarySummary` to the `UiCommand` discriminated union array (after `SyncItineraryExperiences`):

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDestinationDetail,
  SetBookingSummary,
  ShowCabinOptions,
  ShowCabinDetail,
  ShowCityDetail,
  ShowExperienceDetail,
  AddCabinToBasket,
  AddExperienceToBasket,
  SyncItineraryExperiences,
  ShowItinerarySummary, // ← here
]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: PASS (all three new tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add show_itinerary_summary wire schema"
```

---

## Task 2: Nullable internal type + `toItinerarySummary` mapper

**Files:**
- Modify: `lib/itinerary-summary/types.ts`
- Create: `lib/itinerary-summary/from-wire.ts`
- Test: `lib/itinerary-summary/from-wire.test.ts`

- [ ] **Step 1: Make the internal type nullable**

Replace the contents of `lib/itinerary-summary/types.ts` with:

```ts
import type { Cabin } from '@/lib/agent-ui/commands';

export type SummaryItineraryCity = {
  id: string;
  name: string;
  country: string;
  days: string; // "Days 1, 2 & 8"
  image: string;
};

export type ItinerarySummaryDetails = {
  guests: string | null;
  month: string | null;
  embarkation: string | null;
  stops: string | null;
  dates: string | null;
  pricePerPerson: string | null;
  cabinName: string | null;
};

export type ItinerarySummaryPackage = {
  pricePerPerson: string | null;
  name: string | null;
  inclusions: string[];
};

export type ItinerarySummaryItinerary = {
  title: string | null;
  countries: string[];
  description: string | null;
  cities: SummaryItineraryCity[];
};

export type ItinerarySummary = {
  header: { title: string | null; subtitle: string | null; image: string | null };
  details: ItinerarySummaryDetails;
  cabin: Cabin | null;
  package: ItinerarySummaryPackage | null;
  itinerary: ItinerarySummaryItinerary | null;
  total: string | null;
};
```

- [ ] **Step 2: Write the failing mapper test**

Create `lib/itinerary-summary/from-wire.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ItinerarySummaryWire } from '@/lib/agent-ui/commands';
import { toItinerarySummary } from './from-wire';

const wireFull: ItinerarySummaryWire = {
  header: { title: 'Danube', subtitle: 'Anniversary', image: '/h.jpg' },
  details: {
    guests: '2 people',
    month: 'September',
    embarkation: 'Vienna',
    stops: 'Budapest +3',
    dates: '20 – 27 Sep 2026',
    price_per_person: '€ 9,174 p.p.',
    cabin_name: "Owner's Suite",
  },
  cabin: {
    id: 'owners-suite',
    name: "Owner's Suite",
    image: '/cabin/1.png',
    guests: 2,
    area: 80,
    price_from: 12229,
    view: 'Balcony',
    detail: { gallery: ['/g1.png'], bedroom: [], bathroom: [], amenities: [] },
  },
  package: { price_per_person: '€ 9,174 p.p.', name: 'Premium', inclusions: ['Free Wifi'] },
  itinerary: {
    title: 'Vienna – Vienna',
    countries: ['Austria'],
    description: 'A week',
    cities: [{ id: 'vienna', name: 'Vienna', country: 'Austria', days: 'Days 1', image: '/v.jpg' }],
  },
  total: '€ 27,240',
};

describe('toItinerarySummary', () => {
  it('renames snake_case detail/package fields to camelCase', () => {
    const out = toItinerarySummary(wireFull);
    expect(out.details.pricePerPerson).toBe('€ 9,174 p.p.');
    expect(out.details.cabinName).toBe("Owner's Suite");
    expect(out.package?.pricePerPerson).toBe('€ 9,174 p.p.');
  });

  it('passes the cabin object through unchanged (already snake_case)', () => {
    const out = toItinerarySummary(wireFull);
    expect(out.cabin?.price_from).toBe(12229);
  });

  it('passes null sections and fields through', () => {
    const out = toItinerarySummary({
      header: { title: null, subtitle: null, image: null },
      details: {
        guests: null,
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: null,
        cabin_name: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    });
    expect(out.cabin).toBeNull();
    expect(out.package).toBeNull();
    expect(out.itinerary).toBeNull();
    expect(out.total).toBeNull();
    expect(out.details.cabinName).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run lib/itinerary-summary/from-wire.test.ts`
Expected: FAIL — `./from-wire` does not exist.

- [ ] **Step 4: Write the mapper**

Create `lib/itinerary-summary/from-wire.ts`:

```ts
import type { ItinerarySummaryWire } from '@/lib/agent-ui/commands';
import type { ItinerarySummary } from './types';

// Maps the snake_case wire payload to the internal camelCase ItinerarySummary.
// Only `details` and `package` carry renamed keys; everything else is identical,
// and the `cabin` object is already in the shared Cabin (snake_case) shape.
export function toItinerarySummary(wire: ItinerarySummaryWire): ItinerarySummary {
  return {
    header: wire.header,
    details: {
      guests: wire.details.guests,
      month: wire.details.month,
      embarkation: wire.details.embarkation,
      stops: wire.details.stops,
      dates: wire.details.dates,
      pricePerPerson: wire.details.price_per_person,
      cabinName: wire.details.cabin_name,
    },
    cabin: wire.cabin,
    package: wire.package
      ? {
          pricePerPerson: wire.package.price_per_person,
          name: wire.package.name,
          inclusions: wire.package.inclusions,
        }
      : null,
    itinerary: wire.itinerary,
    total: wire.total,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/itinerary-summary/from-wire.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/itinerary-summary/types.ts lib/itinerary-summary/from-wire.ts lib/itinerary-summary/from-wire.test.ts
git commit -m "feat(itinerary-summary): nullable type + wire mapper"
```

---

## Task 3: Store slice, reducer case, setters, hooks

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('ui-view-store', ...)` block in `lib/agent-ui/ui-view-store.test.ts`:

```ts
it('applyCommand(show_itinerary_summary) fills the slice and leaves view untouched', () => {
  store.getState().applyCommand({
    type: 'show_itinerary_summary',
    correlationId: 'c1',
    payload: {
      header: { title: 'Danube', subtitle: null, image: null },
      details: {
        guests: '2 people',
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: null,
        cabin_name: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    },
  });
  const s = store.getState();
  expect(s.itinerarySummary?.header.title).toBe('Danube');
  expect(s.itinerarySummary?.details.guests).toBe('2 people');
  expect(s.itinerarySummary?.cabin).toBeNull();
  expect(s.view).toEqual({ type: 'start' }); // overlay — view unchanged
  expect(s.source).toBe('agent');
  expect(s.lastCorrelationId).toBe('c1');
});

it('closeItinerarySummary clears the slice with source user', () => {
  store.getState().applyCommand({
    type: 'show_itinerary_summary',
    correlationId: 'c1',
    payload: {
      header: { title: 'Danube', subtitle: null, image: null },
      details: {
        guests: null,
        month: null,
        embarkation: null,
        stops: null,
        dates: null,
        price_per_person: null,
        cabin_name: null,
      },
      cabin: null,
      package: null,
      itinerary: null,
      total: null,
    },
  });
  store.getState().closeItinerarySummary();
  const s = store.getState();
  expect(s.itinerarySummary).toBeNull();
  expect(s.source).toBe('user');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `itinerarySummary` / `closeItinerarySummary` do not exist (and TS compile error on the missing reducer case).

- [ ] **Step 3: Add slice, setters, and reducer case**

In `lib/agent-ui/ui-view-store.ts`:

3a. Update imports at top:
```ts
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';
import { toItinerarySummary } from '@/lib/itinerary-summary/from-wire';
```

3b. Add to the `UiViewState` interface (after `addedExperiences`):
```ts
  itinerarySummary: ItinerarySummary | null;
```
and after the existing setter signatures:
```ts
  setItinerarySummaryFromDev: (summary: ItinerarySummary | null) => void;
  closeItinerarySummary: () => void;
```

3c. Add to the initial state object (after `addedExperiences: [],`):
```ts
        itinerarySummary: null,
```

3d. Add the reducer case inside `applyCommand`'s switch, before `default:`:
```ts
                case 'show_itinerary_summary':
                  return {
                    itinerarySummary: toItinerarySummary(cmd.payload),
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
```

3e. Add the two setters after `clearAddedExperiencesFromDev`:
```ts
        setItinerarySummaryFromDev: (summary) =>
          set(
            { itinerarySummary: summary, source: 'dev', lastCorrelationId: null },
            false,
            'setItinerarySummaryFromDev'
          ),

        closeItinerarySummary: () =>
          set(
            { itinerarySummary: null, source: 'user', lastCorrelationId: null },
            false,
            'closeItinerarySummary'
          ),
```

- [ ] **Step 4: Add hooks**

In `lib/agent-ui/hooks.ts`, append:
```ts
export const useItinerarySummary = () => useUiViewStore((s) => s.itinerarySummary);
export const useCloseItinerarySummary = () => useUiViewStore((s) => s.closeItinerarySummary);
export const useSetItinerarySummaryFromDev = () =>
  useUiViewStore((s) => s.setItinerarySummaryFromDev);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/hooks.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(store): itinerarySummary slice + close/dev setters"
```

---

## Task 4: Placeholder copy + nullable modal sub-components

No new logic, so no unit tests — verified by typecheck (`pnpm lint`) and the dev panel in Task 6. Each component must accept its existing prop possibly `null` and render a placeholder.

**Files:**
- Modify: `lib/itinerary-summary/copy.ts`
- Modify: `components/panels/itinerary-summary/summary-header.tsx`
- Modify: `components/panels/itinerary-summary/summary-details-row.tsx`
- Modify: `components/panels/itinerary-summary/summary-cabin-card.tsx`
- Modify: `components/panels/itinerary-summary/summary-package-card.tsx`
- Modify: `components/panels/itinerary-summary/summary-itinerary-column.tsx`
- Modify: `components/panels/itinerary-summary/summary-footer-bar.tsx`

- [ ] **Step 1: Add placeholder copy**

Append to `lib/itinerary-summary/copy.ts`:
```ts
// Placeholders shown when a section/field is not yet chosen (partial booking).
export const SUMMARY_PLACEHOLDER = {
  field: '—',
  title: 'Your itinerary',
  cabin: 'Cabin not selected yet',
  package: 'Package not selected yet',
  itinerary: 'Itinerary not defined yet',
  image: '/cabin/1.png',
} as const;
```

- [ ] **Step 2: `SummaryHeader` — null title/subtitle/image**

Replace `summary-header.tsx` body's `Image`/text usage so it tolerates null:
```tsx
import Image from 'next/image';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryHeader({ header }: { header: ItinerarySummary['header'] }) {
  const title = header.title ?? SUMMARY_PLACEHOLDER.title;
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl sm:h-96">
      <Image
        src={header.image ?? SUMMARY_PLACEHOLDER.image}
        alt={title}
        fill
        sizes="(min-width: 1280px) 1216px, 100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute right-6 bottom-6 left-6 text-white">
        <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{title}</h2>
        {header.subtitle && (
          <p className="mt-2 text-base text-white/85 sm:text-lg">{header.subtitle}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `SummaryDetailsRow` — null fields → muted "—"**

Replace `summary-details-row.tsx` so each field falls back and dims when null:
```tsx
import {
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Euro,
  MapPin,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummaryDetails } from '@/lib/itinerary-summary/types';

export function SummaryDetailsRow({ details }: { details: ItinerarySummaryDetails }) {
  const fields: { key: string; icon: React.ReactNode; value: string | null }[] = [
    { key: 'guests', icon: <Users className="size-4" />, value: details.guests },
    { key: 'month', icon: <CalendarDays className="size-4" />, value: details.month },
    { key: 'embarkation', icon: <MapPin className="size-4" />, value: details.embarkation },
    { key: 'stops', icon: <BookOpen className="size-4" />, value: details.stops },
    { key: 'dates', icon: <CalendarRange className="size-4" />, value: details.dates },
    { key: 'pricePerPerson', icon: <Euro className="size-4" />, value: details.pricePerPerson },
    { key: 'cabinName', icon: <BedDouble className="size-4" />, value: details.cabinName },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {fields.map((field) => (
        <span
          key={field.key}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm',
            field.value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span className="text-muted-foreground">{field.icon}</span>
          {field.value ?? SUMMARY_PLACEHOLDER.field}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `SummaryCabinCard` — render placeholder when cabin is null**

The card itself still takes a non-null `Cabin`; add a sibling placeholder and let the parent decide. Replace `summary-cabin-card.tsx`'s export to accept `Cabin | null`:
```tsx
import { ArmchairIcon, BathtubIcon, BedIcon } from '@phosphor-icons/react';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';

function SummaryPlaceholderCard({ label }: { label: string }) {
  return (
    <div className="bg-beige-200 text-muted-foreground flex min-h-40 items-center justify-center rounded-2xl p-6 text-sm">
      {label}
    </div>
  );
}

export function SummaryCabinCard({ cabin }: { cabin: Cabin | null }) {
  if (!cabin) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.cabin} />;

  const meta = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.price_from)} EUR`,
    cabin.view,
  ];

  return (
    <div className="bg-beige-200 flex flex-col overflow-hidden rounded-2xl">
      <div className="h-72 sm:h-80">
        <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
      </div>
      <div className="flex flex-col gap-6 p-6 pt-2">
        <div>
          <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
            {cabin.name}
          </h3>
          <PipeSeparatedList items={meta} className="mt-2 gap-x-3 gap-y-1" />
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
            <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
          </div>
          <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
        </div>
      </div>
    </div>
  );
}

export { SummaryPlaceholderCard };
```

- [ ] **Step 5: `SummaryPackageCard` — render placeholder when package is null**

Replace `summary-package-card.tsx` export to accept `ItinerarySummaryPackage | null`:
```tsx
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryPlaceholderCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummaryPackage } from '@/lib/itinerary-summary/types';

export function SummaryPackageCard({ pkg }: { pkg: ItinerarySummaryPackage | null }) {
  if (!pkg) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.package} />;

  return (
    <div className="bg-beige-200 flex flex-col gap-5 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-neutral-700">Package</h3>
        <Button variant="link" size="sm" className="gap-1 px-0">
          Change package
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="border-beige-300 rounded-2xl border p-5">
        {pkg.pricePerPerson && (
          <div className="flex items-center gap-2">
            <span className="bg-primary size-2.5 rounded-full" aria-hidden />
            <span className="text-foreground text-sm">{pkg.pricePerPerson}</span>
          </div>
        )}
        <p className="font-display mt-4 text-2xl leading-snug font-semibold text-neutral-700">
          {pkg.name ?? SUMMARY_PLACEHOLDER.package}
        </p>
        <ul className="border-beige-300 mt-4 border-t">
          {pkg.inclusions.map((item) => (
            <li
              key={item}
              className="border-beige-300 text-muted-foreground border-b py-3 text-sm last:border-b-0"
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

- [ ] **Step 6: `SummaryItineraryColumn` — render placeholder when itinerary is null**

Replace `summary-itinerary-column.tsx`:
```tsx
import { SummaryCityCard } from '@/components/panels/itinerary-summary/summary-city-card';
import { SummaryPlaceholderCard } from '@/components/panels/itinerary-summary/summary-cabin-card';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import { SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';

export function SummaryItineraryColumn({
  itinerary,
}: {
  itinerary: ItinerarySummary['itinerary'];
}) {
  if (!itinerary) return <SummaryPlaceholderCard label={SUMMARY_PLACEHOLDER.itinerary} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-3xl leading-tight font-semibold text-neutral-700">
          {itinerary.title ?? SUMMARY_PLACEHOLDER.title}
        </h3>
        <PipeSeparatedList items={itinerary.countries} className="mt-2 gap-x-2" />
        {itinerary.description && (
          <p className="text-foreground mt-4 text-base leading-relaxed">{itinerary.description}</p>
        )}
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

- [ ] **Step 7: `SummaryFooterBar` — null total → muted "—"**

Replace `summary-footer-bar.tsx`:
```tsx
import { Button } from '@/components/ui/button';
import { SUMMARY_CTA, SUMMARY_PLACEHOLDER } from '@/lib/itinerary-summary/copy';

export function SummaryFooterBar({ total }: { total: string | null }) {
  return (
    <div className="border-beige-300 flex flex-wrap items-center justify-between gap-3 border-t bg-neutral-50 px-4 py-4 sm:px-6">
      <p className="font-display text-2xl font-semibold text-green-700">
        Total: {total ?? SUMMARY_PLACEHOLDER.field}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="secondary">{SUMMARY_CTA.specialist}</Button>
        <Button>{SUMMARY_CTA.booking}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run lint to surface the remaining null issue**

Run: `pnpm lint`
Expected: FAIL — `itinerary-summary-modal.tsx`'s `DialogPrimitive.Title`/`Description` interpolate `data.header.title` / `data.details.*`, now `string | null`. Fixed in the next step.

- [ ] **Step 9: Fix the modal's aria Description for nulls**

In `components/panels/itinerary-summary/itinerary-summary-modal.tsx`, the `DialogPrimitive.Description` interpolates `data.details.*`. Replace it with a null-safe line:
```tsx
            <DialogPrimitive.Description className="sr-only">
              {[data.details.guests, data.details.dates, data.details.embarkation]
                .filter(Boolean)
                .join(' · ')}
            </DialogPrimitive.Description>
```
And the `DialogPrimitive.Title` uses `data.header.title`; replace with:
```tsx
            <DialogPrimitive.Title className="sr-only">
              {data.header.title ?? 'Itinerary summary'}
            </DialogPrimitive.Title>
```

- [ ] **Step 10: Run lint again**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add lib/itinerary-summary/copy.ts components/panels/itinerary-summary/
git commit -m "feat(itinerary-summary): placeholders for partial bookings"
```

---

## Task 5: Wire the button to the intent + render modal from store

**Files:**
- Modify: `components/agent-ui/booking-summary.tsx`

- [ ] **Step 1: Rewrite the component**

Replace `components/agent-ui/booking-summary.tsx` so the button emits the intent and the modal reads from the store. Remove `useState`, the `ITINERARY_SUMMARY_MOCK` import, and add the intent + store hooks:

```tsx
'use client';

import {
  BookOpen,
  CalendarDays,
  Clock,
  Euro,
  MapPin,
  Maximize2,
  Save,
  Share,
  Users,
} from 'lucide-react';
import { ItinerarySummaryModal } from '@/components/panels/itinerary-summary/itinerary-summary-modal';
import { Button } from '@/components/ui/button';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import {
  useBookingSummary,
  useCloseItinerarySummary,
  useItinerarySummary,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { BookingSummary as BookingSummaryType } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/shadcn/utils';
```

Keep `SummaryField`, `Slot`, and their interfaces unchanged. Change `BookingSummary` to use the intent + store-driven modal:

```tsx
export function BookingSummary({ summary }: BookingSummaryProps) {
  const sendIntent = useFrontendIntent();
  const itinerarySummary = useItinerarySummary();
  const closeItinerarySummary = useCloseItinerarySummary();

  const stopsLabel = summary.stops
    ? summary.stops.extra > 0
      ? `${summary.stops.primary} +${summary.stops.extra}`
      : summary.stops.primary
    : null;

  return (
    <div
      className={cn(
        'bg-card/95 border-beige-300 pointer-events-auto rounded-3xl border p-6 backdrop-blur',
        'm-[0_auto] flex w-full max-w-[1280px] flex-col gap-4 md:min-w-[640px]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <SummaryField
            icon={<Users className="size-4" />}
            label={summary.people?.label ?? 'People'}
            muted={!summary.people}
          />
          <SummaryField
            icon={<CalendarDays className="size-4" />}
            label={summary.month?.label ?? 'Month'}
            muted={!summary.month}
          />
          <SummaryField
            icon={<MapPin className="size-4" />}
            label={summary.embarkation?.label ?? 'Embark'}
            muted={!summary.embarkation}
          />
          <SummaryField
            icon={<BookOpen className="size-4" />}
            label={stopsLabel ?? 'Stops'}
            muted={!stopsLabel}
          />
          <SummaryField
            icon={<Clock className="size-4" />}
            label={summary.duration?.label ?? 'Days'}
            muted={!summary.duration}
          />
          <SummaryField
            icon={<Euro className="size-4" />}
            label={summary.price?.label ?? 'Price'}
            muted={!summary.price}
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => sendIntent('view_itinerary_summary')}
        >
          <Maximize2 className="size-3.5" />
          Itinerary Summary
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {summary.slots.map((slot, i) => (
            <Slot key={`${slot.label}-${i}`} label={slot.label} state={slot.state} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Share">
            <Share className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Save">
            <Save className="size-4" />
          </Button>
          <Button disabled={!summary.cta.enabled}>{summary.cta.label}</Button>
        </div>
      </div>

      {itinerarySummary && (
        <ItinerarySummaryModal
          open
          onOpenChange={(o) => {
            if (!o) closeItinerarySummary();
          }}
          data={itinerarySummary}
        />
      )}
    </div>
  );
}
```

Leave `BookingSummaryContainer` unchanged.

- [ ] **Step 2: Run lint + tests**

Run: `pnpm lint && pnpm vitest run`
Expected: PASS. (No `ITINERARY_SUMMARY_MOCK` import remains.)

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/booking-summary.tsx
git commit -m "feat(booking-summary): emit view_itinerary_summary intent, render modal from store"
```

---

## Task 6: Dev panel control + mocks

**Files:**
- Modify: `lib/dev/mocks.ts`
- Modify: `lib/dev/dev-panel.tsx`

- [ ] **Step 1: Add mocks**

In `lib/dev/mocks.ts`:

1a. Add imports at top (the `ITINERARY_SUMMARY_MOCK` full sample already exists):
```ts
import type { ItinerarySummary } from '@/lib/itinerary-summary/types';
import { ITINERARY_SUMMARY_MOCK } from '@/lib/itinerary-summary/mock';
```

1b. Append at the end of the file:
```ts
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
```

> Note: `ITINERARY_SUMMARY_MOCK` already conforms to the now-nullable `ItinerarySummary` type (all fields present), so it needs no change.

- [ ] **Step 2: Add the dev-panel control**

In `lib/dev/dev-panel.tsx`:

2a. Add to the hooks import from `@/lib/agent-ui/hooks`:
```ts
  useSetItinerarySummaryFromDev,
```
2b. Add to the mocks import from `./mocks`:
```ts
import { BOOKING_SUMMARY_MOCKS, ITINERARY_SUMMARY_MOCKS, SYNC_EXPERIENCES_MOCKS, VIEW_MOCKS } from './mocks';
```
2c. Inside `DevPanel`, near the other setter hooks:
```ts
  const setItinerarySummaryFromDev = useSetItinerarySummaryFromDev();
```
2d. Near the other mock-id state:
```ts
  const [itinerarySummaryMockId, setItinerarySummaryMockId] = useState(
    ITINERARY_SUMMARY_MOCKS[0]?.id ?? ''
  );
```
2e. Near the other `apply*` handlers:
```ts
  const applyItinerarySummary = () => {
    const chosen =
      ITINERARY_SUMMARY_MOCKS.find((m) => m.id === itinerarySummaryMockId) ??
      ITINERARY_SUMMARY_MOCKS[0];
    if (chosen) setItinerarySummaryFromDev(chosen.summary);
  };
```
2f. In the JSX mocks tab, mirror the existing booking-summary control block (find the `<select>` + apply button driven by `summaryMockId`/`applySummary`) and add an analogous block bound to `itinerarySummaryMockId`/`setItinerarySummaryMockId`/`applyItinerarySummary`, labeled "Itinerary Summary".

- [ ] **Step 3: Verify in the dev panel**

Run: `pnpm dev`
- Open the dev panel → select "Itinerary Summary" → "Full" → Apply: modal opens with full data.
- Select "All placeholders" → Apply: modal opens with placeholder sections.
- Close the modal (X/Esc): modal closes, slice cleared (source `user`).

(Per repo convention, no automated browser test unless requested.)

- [ ] **Step 4: Run lint + tests**

Run: `pnpm lint && pnpm vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dev/mocks.ts lib/dev/dev-panel.tsx
git commit -m "feat(dev): itinerary summary mocks + dev-panel control"
```

---

## Task 7: Document the intent

**Files:**
- Modify: `conventions/frontend-intents.md`

- [ ] **Step 1: Add the intent to the docs**

In `conventions/frontend-intents.md`, add a new intent entry (after `select_cabin`, renumbering is unnecessary — append under a new "Summary" subsection) and a row to the summary table:

New subsection:
```markdown
### Itinerary summary

Fuente: [`components/agent-ui/booking-summary.tsx`](../components/agent-ui/booking-summary.tsx).

#### 8. `view_itinerary_summary`

El usuario abre el modal de resumen del itinerario (botón "Itinerary Summary").

- **entities:** _(ninguna)_
- **vuelve:** `show_itinerary_summary`

> El cierre del modal es puramente local (no emite intent).
```

New table row (append to the summary table):
```markdown
| `view_itinerary_summary` | _(ninguna)_              | Abrir modal Itinerary Summary           | `show_itinerary_summary`                           |
```

- [ ] **Step 2: Commit**

```bash
git add conventions/frontend-intents.md
git commit -m "docs(intents): document view_itinerary_summary"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full lint + test run**

Run: `pnpm lint && pnpm test`
Expected: both clean. (AGENTS.MD hard rule: never push without clean lint + test.)

- [ ] **Step 2: Manual smoke (dev panel)**

Run: `pnpm dev` — confirm full / placeholder / close behaviors from Task 6 Step 3 once more against the committed code.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/show-itinerary-summary-command
```
