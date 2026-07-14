# Excursions Selection Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `ExcursionsPanel`'s experience selection to real `explore_experience`/`select_experience` intents (mirroring `PanelMap`), and scope each experience's day selector to the days of its own city instead of the union of every city in the itinerary.

**Architecture:** A new pure function `buildExperienceDayOptions` builds an `experienceId → days` map from `ItineraryCity[]`. `CityExperiencesPanel`'s `dayOptions: string[]` prop becomes `getDayOptions: (experience) => string[]` so each row can resolve its own days; `PanelMap` wraps its existing single-city day list in a constant function to keep the same behavior. `ExcursionsPanel` gets its own `handleExperienceExplore`/`handleExperienceConfirm` (same shape as `PanelMap`'s, duplicated rather than shared — see spec) wired to `useFrontendIntent`.

**Tech Stack:** Next.js, React, TypeScript, Zustand (`useAddedExperiences`, `useFrontendIntent`), Vitest.

## Global Constraints

- Package manager is `pnpm` — never `npm`/`yarn`.
- Per `conventions/testing.md`, only `lib/**/*.test.ts` is collected by the automated suite; React components are verified manually via the dev panel, not with component tests. Do not add `.test.tsx` files.
- Automated verification per task: `pnpm exec tsc --noEmit` + `pnpm lint`, plus (Task 1 only) the new Vitest file. Run the full `pnpm test` suite only in the final task.
- Do not modify `components/ui/` (shadcn primitives).
- Do not touch `PanelMap`'s `handleExperienceExplore`/`handleExperienceConfirm` logic beyond the one-line prop it passes to `CityExperiencesPanel` — no shared hook extraction (see spec: "cambios quirúrgicos").
- Follow the spec exactly: [`docs/superpowers/specs/2026-07-13-excursions-selection-design.md`](../specs/2026-07-13-excursions-selection-design.md).

---

### Task 1: `buildExperienceDayOptions` pure function

**Files:**
- Create: `lib/map/build-experience-day-options.ts`
- Test: `lib/map/build-experience-day-options.test.ts`

**Interfaces:**
- Produces: `buildExperienceDayOptions(cities: ItineraryCity[]): Map<string, string[]>` — maps each experience's `id` to the parsed days (`parseCityDays(city.days)`) of the city it belongs to. Consumed by Task 3.
- Consumes: `ItineraryCity`, `Experience` types from `@/lib/agent-ui/commands`; `parseCityDays` from `@/lib/map/parse-city-days` (both already exist, unchanged).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/map/build-experience-day-options.test.ts
import { describe, expect, it } from 'vitest';
import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { buildExperienceDayOptions } from './build-experience-day-options';

function city(overrides: Partial<ItineraryCity>): ItineraryCity {
  return {
    id: 'city-1',
    name: 'Budapest',
    country: 'Hungary',
    image: 'budapest.jpg',
    days: 'Days 1 & 2',
    lon: 19.04,
    lat: 47.5,
    ...overrides,
  };
}

describe('buildExperienceDayOptions', () => {
  it("maps each experience to its own city's parsed days", () => {
    const cities: ItineraryCity[] = [
      city({
        id: 'budapest',
        days: 'Days 1 & 2',
        experiences: [
          { id: 'exp-1', name: 'Thermal baths', type: 'wellness', venue: null, description: 'Relax.' },
        ],
      }),
      city({
        id: 'vienna',
        days: 'Days 4, 5 & 6',
        experiences: [
          { id: 'exp-2', name: 'Opera tour', type: 'culture', venue: null, description: 'Backstage.' },
        ],
      }),
    ];

    const result = buildExperienceDayOptions(cities);

    expect(result.get('exp-1')).toEqual(['Day 1', 'Day 2']);
    expect(result.get('exp-2')).toEqual(['Day 4', 'Day 5', 'Day 6']);
  });

  it('skips a city with no experiences', () => {
    const cities: ItineraryCity[] = [city({ id: 'budapest', days: 'Day 1' })];

    const result = buildExperienceDayOptions(cities);

    expect(result.size).toBe(0);
  });

  it('returns an empty map for no cities', () => {
    expect(buildExperienceDayOptions([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test build-experience-day-options`
Expected: FAIL — `Cannot find module './build-experience-day-options'` (or similar module-not-found error).

- [ ] **Step 3: Write the implementation**

```ts
// lib/map/build-experience-day-options.ts
import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { parseCityDays } from '@/lib/map/parse-city-days';

export function buildExperienceDayOptions(cities: ItineraryCity[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const city of cities) {
    const days = parseCityDays(city.days);
    for (const experience of city.experiences ?? []) {
      map.set(experience.id, days);
    }
  }
  return map;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test build-experience-day-options`
Expected: PASS (3/3 tests).

- [ ] **Step 5: Verify types and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/map/build-experience-day-options.ts lib/map/build-experience-day-options.test.ts
git commit -m "feat(map): add buildExperienceDayOptions to scope days per experience's city"
```

---

### Task 2: `CityExperiencesPanel` day-options resolver

**Files:**
- Modify: `components/panels/map/city-experiences-panel.tsx`
- Modify: `components/panels/map/panel-map.tsx`

**Interfaces:**
- Produces: `CityExperiencesPanelProps.getDayOptions: (experience: Experience) => string[]` (replaces `dayOptions: string[]`). Consumed by Task 3.
- Consumes: nothing new — this task only changes an existing prop's shape and its one existing call site.

Both files must change in this task (not split further): `CityExperiencesPanel`'s only current consumer is `PanelMap`, and leaving them out of sync would break the build.

- [ ] **Step 1: Change the prop in `city-experiences-panel.tsx`**

In `components/panels/map/city-experiences-panel.tsx`, replace the type and destructuring:

```ts
type CityExperiencesPanelProps = {
  experiences: Experience[];
  detailExperienceId: string | null;
  getDayOptions: (experience: Experience) => string[];
  addedExperiences: Array<{ experienceId: string; day: string }>;
  onExplore: (experience: Experience) => void;
  onConfirm: (experience: Experience, day: string) => void;
};

export function CityExperiencesPanel({
  experiences,
  detailExperienceId,
  getDayOptions,
  addedExperiences,
  onExplore,
  onConfirm,
}: CityExperiencesPanelProps) {
```

Then in the `experiences.map(...)` block, change the `ExperienceCard`'s `dayOptions` prop from the old shared `dayOptions` to a per-row resolved value:

```tsx
            dayOptions={getDayOptions(experience)}
```

(This is the same `<ExperienceCard ... />` JSX already in the file — only the `dayOptions` line's right-hand side changes, from `dayOptions` to `getDayOptions(experience)`. Everything else in that block — `key`, `experience`, `expanded`, `onToggle`, `addedDays`, `onConfirm` — stays exactly as-is.)

- [ ] **Step 2: Update the call site in `panel-map.tsx`**

In `components/panels/map/panel-map.tsx`, find where `<CityExperiencesPanel ... />` is rendered (currently passes `dayOptions={dayOptions}`) and change that one prop:

```tsx
              getDayOptions={() => dayOptions}
```

The `dayOptions` local variable above it (`const dayOptions = detailCity ? parseCityDays(detailCity.days) : [];`) is unchanged — still a single array shared by every experience in that one city's detail view, just now wrapped in a constant function to match the new prop signature.

- [ ] **Step 3: Verify types and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors. (No test command here — no `.test.ts` files touched in this task; `pnpm test` runs unchanged in the final task.)

- [ ] **Step 4: Commit**

```bash
git add components/panels/map/city-experiences-panel.tsx components/panels/map/panel-map.tsx
git commit -m "refactor(map): CityExperiencesPanel resolves day options per experience"
```

---

### Task 3: Wire `ExcursionsPanel` to real intents and per-city days

**Files:**
- Modify: `components/panels/itinerary/excursions-panel.tsx`

**Interfaces:**
- Consumes: `buildExperienceDayOptions` from Task 1 (`@/lib/map/build-experience-day-options`); `CityExperiencesPanelProps.getDayOptions` from Task 2; existing `useFrontendIntent` (`@/hooks/use-frontend-intent`, same hook `PanelMap` already uses — returns a `sendIntent(type, { entities, userMessage })` function); existing `useAddedExperiences` (unchanged).
- Produces: nothing new for later tasks — this is the last task in the plan.

- [ ] **Step 1: Rewrite `excursions-panel.tsx`**

Replace the full file content:

```tsx
'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { Card } from '@/components/ui/card';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Experience, ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { buildExperienceDayOptions } from '@/lib/map/build-experience-day-options';

const CARD_WIDTH = 380;

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
};

export function ExcursionsPanel({ itinerary }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const sendIntent = useFrontendIntent();
  const cities = itinerary?.cities ?? [];
  const experiences = cities.flatMap((city) => city.experiences ?? []);
  const dayOptionsByExperience = buildExperienceDayOptions(cities);

  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  const handleExperienceConfirm = useCallback(
    (experience: Experience, day: string) => {
      void sendIntent('select_experience', {
        entities: { experience_id: experience.id, day },
        userMessage: `User added ${experience.name} for ${day}`,
      });
    },
    [sendIntent]
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 p-6">
      <CruiseHeroCard />
      <CityExperiencesPanel
        experiences={experiences}
        detailExperienceId={null}
        getDayOptions={(experience) => dayOptionsByExperience.get(experience.id) ?? []}
        addedExperiences={addedExperiences}
        onExplore={handleExperienceExplore}
        onConfirm={handleExperienceConfirm}
      />
    </div>
  );
}

function CruiseHeroCard() {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-full flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
      style={{ width: CARD_WIDTH }}
    >
      <div className="relative h-[200px] w-full shrink-0">
        <Image
          src="/hero-image.jpg"
          alt="Riverside cruise along the Danube"
          fill
          sizes="356px"
          className="rounded-lg object-cover"
        />
      </div>
      <div className="mt-4 flex flex-col gap-4 px-2 pb-2">
        <div>
          <p className="text-2xl leading-tight">Danube Legends</p>
          <p className="text-primary mt-1 text-sm leading-relaxed">
            Explore Riverside luxury along the Danube, visiting Budapest, Bratislava and Vienna.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Time spent
          </p>
          <p className="text-primary mt-1 text-sm">Mostly on board</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Perfect for
          </p>
          <p className="text-primary mt-1 text-sm">Romantic getaways</p>
        </div>
      </div>
    </Card>
  );
}
```

Note what changed vs. the current file: `parseCityDays` import and the deduplicated `dayOptions` calculation are removed (no longer used — replaced by `dayOptionsByExperience`); `useCallback`, `useFrontendIntent`, `Experience` type, and `buildExperienceDayOptions` are added; `onExplore`/`onConfirm` go from no-ops to the two new handlers; `CruiseHeroCard` is untouched.

- [ ] **Step 2: Verify types and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including the 3 new tests from Task 1 (previous suite size + 3).

- [ ] **Step 4: Manual verification (dev panel)**

Per `conventions/testing.md`, this component's behavior is verified manually, not with component tests:

1. `pnpm dev` → open the dev panel → view `itinerary`, mock `danube_legends`.
2. Switch to the Excursions tab.
3. Expand an experience belonging to one city (e.g. Budapest): confirm the day `<select>` only lists that city's days (not the full itinerary's days).
4. Expand an experience belonging to a different city in the same itinerary: confirm its day options are that other city's days.
5. Pick a day and click Confirm: the card should flip to the "Added" state (this already reads live `useAddedExperiences` state — no mock involved).
6. With browser dev tools open (Network tab or console, depending on how `useFrontendIntent` surfaces sends), confirm opening an experience fires `explore_experience` with the right `experience_id`, and confirming a day fires `select_experience` with the right `experience_id` and `day`.

- [ ] **Step 5: Commit**

```bash
git add components/panels/itinerary/excursions-panel.tsx
git commit -m "feat(itinerary): wire Excursions experience selection to real intents"
```
