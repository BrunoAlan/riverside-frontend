# Cabin Selection Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CabinSelection` content panel that displays the 6 cruise suites as a responsive card grid, selectable from the panel dropdown.

**Architecture:** Mirror the existing `CityCard` + `lib/map/cities.ts` + `PanelMap` pattern: a static `lib/cabins.ts` data module, a `CabinCard` presentational component, a `PanelCabinSelection` panel, and one new entry in the content-panel registry.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui (`Card`, `Button`), `@phosphor-icons/react`, `next/image`, Vitest.

---

## File Structure

- `lib/cabins.ts` — `Cabin` type, `cabins` data array, `formatCabinPrice` helper.
- `lib/cabins.test.ts` — Vitest test for `formatCabinPrice` (the only unit testable per the project's `lib/**/*.test.ts` + `node` env config).
- `components/app/content-panels/cabin-card.tsx` — `CabinCard` presentational component.
- `components/app/content-panels/panel-cabin-selection.tsx` — `PanelCabinSelection` panel.
- `components/app/content-panels/registry.ts` — modify: append the `cabins` entry.

Note: `vitest.config.ts` only includes `lib/**/*.test.ts` in a `node` environment; no jsdom / React Testing Library is installed. React components are verified visually, consistent with how `CityCard` and existing panels are handled. Only the pure `formatCabinPrice` helper is unit-tested.

---

### Task 1: Cabins data module

**Files:**
- Create: `lib/cabins.ts`
- Test: `lib/cabins.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/cabins.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cabins, formatCabinPrice } from './cabins';

describe('formatCabinPrice', () => {
  it('formats with thousands separators', () => {
    expect(formatCabinPrice(12229)).toBe('12,229');
  });

  it('formats values under 1000 without separators', () => {
    expect(formatCabinPrice(850)).toBe('850');
  });
});

describe('cabins', () => {
  it('contains the 6 suites', () => {
    expect(cabins).toHaveLength(6);
  });

  it('every cabin has a unique id', () => {
    const ids = cabins.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/cabins.test.ts`
Expected: FAIL — cannot resolve `./cabins`.

- [ ] **Step 3: Write the implementation**

Create `lib/cabins.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/cabins.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/cabins.ts lib/cabins.test.ts
git commit -m "feat: add cabins data module"
```

---

### Task 2: CabinCard component

**Files:**
- Create: `components/app/content-panels/cabin-card.tsx`

- [ ] **Step 1: Write the implementation**

Create `components/app/content-panels/cabin-card.tsx`:

```tsx
import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type Cabin, formatCabinPrice } from '@/lib/cabins';

type CabinCardProps = {
  cabin: Cabin;
  interactive?: boolean;
  onExpand?: (cabin: Cabin) => void;
};

export function CabinCard({ cabin, interactive = true, onExpand }: CabinCardProps) {
  const info = [
    `${cabin.guests} guests`,
    `${cabin.area}m²`,
    `from ${formatCabinPrice(cabin.priceFrom)} EUR`,
    cabin.view,
  ];

  return (
    <Card className="bg-beige-50 gap-0 overflow-hidden p-2.5">
      <Image
        src={cabin.image}
        alt={cabin.name}
        width={420}
        height={260}
        className="h-[200px] w-full rounded-lg object-cover"
      />
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <p className="text-2xl leading-tight font-semibold">{cabin.name}</p>
        {interactive && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Expand ${cabin.name}`}
            onClick={() => onExpand?.(cabin)}
          >
            <ArrowsOutSimpleIcon weight="bold" />
          </Button>
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-2 text-sm">
        {info.map((item, index) => (
          <span key={item} className="flex items-center gap-3">
            {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
            {item}
          </span>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/cabin-card.tsx
git commit -m "feat: add CabinCard component"
```

---

### Task 3: PanelCabinSelection panel

**Files:**
- Create: `components/app/content-panels/panel-cabin-selection.tsx`

- [ ] **Step 1: Write the implementation**

Create `components/app/content-panels/panel-cabin-selection.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import { CabinCard } from '@/components/app/content-panels/cabin-card';
import { type Cabin, cabins } from '@/lib/cabins';

export function PanelCabinSelection() {
  const handleExpand = useCallback((cabin: Cabin) => {
    // TODO: wire up expand behavior (e.g. open a detail panel for `cabin`).
    console.log('expand cabin', cabin.id);
  }, []);

  return (
    <div className="bg-beige-200 h-full w-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {cabins.map((cabin) => (
          <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/panel-cabin-selection.tsx
git commit -m "feat: add PanelCabinSelection panel"
```

---

### Task 4: Register the panel

**Files:**
- Modify: `components/app/content-panels/registry.ts`

- [ ] **Step 1: Add the import**

In `components/app/content-panels/registry.ts`, add this import alongside the existing panel imports (keep them alphabetically/import-sorted as the file currently is):

```ts
import { PanelCabinSelection } from '@/components/app/content-panels/panel-cabin-selection';
```

- [ ] **Step 2: Add the registry entry**

Append to the `CONTENT_PANELS` array, after the `compare` entry:

```ts
  { id: 'cabins', label: 'Cabinas', component: PanelCabinSelection },
```

- [ ] **Step 3: Verify it type-checks and lints**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS — no errors.

- [ ] **Step 4: Commit**

```bash
git add components/app/content-panels/registry.ts
git commit -m "feat: register cabin selection panel"
```

---

## Verification

After all tasks:

- [ ] Run `pnpm test` — `lib/cabins.test.ts` passes.
- [ ] Run `pnpm exec tsc --noEmit` — no type errors.
- [ ] Run `pnpm lint` — clean.
- [ ] Run `pnpm dev`, start a session, select "Cabinas" from the panel dropdown — the 6 cabin cards render in a responsive grid (1/2/3 columns). Card images will show broken until `public/cabins/*.jpg` assets are added.
