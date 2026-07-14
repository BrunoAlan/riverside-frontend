# Itinerary Tabs (Overview / Excursions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pill-style segmented control above the itinerary view so the user can switch between "Overview" (the existing map) and "Excursions" (a mocked panel that replaces the map, showing all of the itinerary's experiences next to a hardcoded cruise hero card).

**Architecture:** A new local-state container (`ItineraryPanel`) sits between the existing thin `ItineraryView` and the existing `PanelMap`. It renders a new presentational pill bar (`ItineraryTabs`, built on the shadcn `Tabs` primitive) positioned top-left, and swaps between `PanelMap` (unchanged) and a new `ExcursionsPanel` based on local `useState`. `ExcursionsPanel` reuses the existing `CityExperiencesPanel` unmodified, fed with experiences aggregated across all cities in the itinerary.

**Tech Stack:** Next.js 15 / React 19, Tailwind v4 tokens (`bg-primary`, `bg-beige-200`, etc.), shadcn `Tabs` primitive (`@radix-ui/react-tabs`), Zustand store (`useAddedExperiences`), TypeScript strict mode.

## Global Constraints

- Package manager: `pnpm` only — never `npm`/`yarn`.
- Never hand-edit `components/ui/*` — compose shadcn primitives from outside via `className`/`cn()`.
- No hex literals in component code — use Tailwind tokens (`bg-primary`, `bg-beige-200`, `border-beige-400/50`, etc.).
- File naming: `kebab-case.tsx`; one exported component per file (small private helpers colocated with their sole consumer are fine — see `ExperienceGallery` inside `experience-card.tsx`).
- Per `conventions/testing.md`, React components are **not** unit-tested in this repo (`vitest.config.ts` only collects `lib/**/*.test.ts`); UI is verified via the dev panel instead. **No `.test.ts(x)` files are created in this plan.** Each task's automated verification is `pnpm exec tsc --noEmit` (type-check) and `pnpm lint` instead of a red/green test cycle.
- `pnpm test` (existing suite) and `pnpm lint` must stay green throughout.
- Never push to `main` or merge without both `pnpm lint` and `pnpm test` passing.
- Branch: `feat/itinerary-tabs` (already created and checked out; spec committed there).

---

### Task 1: `ItineraryTabs` pill bar component

**Files:**
- Create: `components/panels/itinerary/itinerary-tabs.tsx`

**Interfaces:**
- Consumes: `Tabs`, `TabsList`, `TabsTrigger` from `@/components/ui/tabs` (existing shadcn primitive, props unchanged); `cn` from `@/lib/shadcn/utils`.
- Produces: `export type ItineraryTab = 'overview' | 'excursions'` and `export function ItineraryTabs({ value, onChange }: { value: ItineraryTab; onChange: (value: ItineraryTab) => void })`. Task 3 imports both.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/shadcn/utils';

export type ItineraryTab = 'overview' | 'excursions';

type ItineraryTabsProps = {
  value: ItineraryTab;
  onChange: (value: ItineraryTab) => void;
};

const TABS: { value: ItineraryTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'excursions', label: 'Excursions' },
];

export function ItineraryTabs({ value, onChange }: ItineraryTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ItineraryTab)}>
      <TabsList className="bg-white/95 h-auto gap-1 rounded-full p-1 shadow-sm">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium',
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none',
              'data-[state=inactive]:bg-beige-200 data-[state=inactive]:text-primary'
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

Create the file at `components/panels/itinerary/itinerary-tabs.tsx` with the content above (this is a new domain folder — `mkdir -p components/panels/itinerary` first if it doesn't exist).

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings on the new file.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/itinerary-tabs.tsx
git commit -m "feat(itinerary): add ItineraryTabs pill segmented control"
```

---

### Task 2: `ExcursionsPanel` mocked content

**Files:**
- Create: `components/panels/itinerary/excursions-panel.tsx`

**Interfaces:**
- Consumes: `CityExperiencesPanel` from `@/components/panels/map/city-experiences-panel` (existing, unmodified — props `experiences: Experience[]`, `detailExperienceId: string | null`, `dayOptions: string[]`, `addedExperiences: Array<{ experienceId: string; day: string }>`, `onExplore: (experience: Experience) => void`, `onConfirm: (experience: Experience, day: string) => void`); `Card` from `@/components/ui/card`; `useAddedExperiences` from `@/lib/agent-ui/hooks`; `type ItineraryFull` from `@/lib/agent-ui/commands`; `parseCityDays` from `@/lib/map/parse-city-days` (existing, `(days: string) => string[]`).
- Produces: `export function ExcursionsPanel({ itinerary }: { itinerary: ItineraryFull | undefined })`. Task 3 imports this.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import Image from 'next/image';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { Card } from '@/components/ui/card';
import type { ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { parseCityDays } from '@/lib/map/parse-city-days';

const CARD_WIDTH = 380;

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
};

export function ExcursionsPanel({ itinerary }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const cities = itinerary?.cities ?? [];
  const experiences = cities.flatMap((city) => city.experiences ?? []);
  const dayOptions = Array.from(new Set(cities.flatMap((city) => parseCityDays(city.days))));

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-4 p-6">
      <CruiseHeroCard />
      <CityExperiencesPanel
        experiences={experiences}
        detailExperienceId={null}
        dayOptions={dayOptions}
        addedExperiences={addedExperiences}
        onExplore={() => {}}
        onConfirm={() => {}}
      />
    </div>
  );
}

function CruiseHeroCard() {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 flex max-h-full flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
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

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings on the new file.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/excursions-panel.tsx
git commit -m "feat(itinerary): add mocked ExcursionsPanel reusing CityExperiencesPanel"
```

---

### Task 3: `ItineraryPanel` container (tabs + content swap)

**Files:**
- Create: `components/panels/itinerary/itinerary-panel.tsx`

**Interfaces:**
- Consumes: `ItineraryTabs`, `type ItineraryTab` from Task 1 (`@/components/panels/itinerary/itinerary-tabs`); `ExcursionsPanel` from Task 2 (`@/components/panels/itinerary/excursions-panel`); `PanelMap` from `@/components/panels/map/panel-map` (existing, prop `view: Extract<UiView, { type: 'itinerary' }>`); `type UiView` from `@/lib/agent-ui/ui-view-types`.
- Produces: `export function ItineraryPanel({ view }: { view: Extract<UiView, { type: 'itinerary' }> })`. Task 4 imports this.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { ExcursionsPanel } from '@/components/panels/itinerary/excursions-panel';
import { type ItineraryTab, ItineraryTabs } from '@/components/panels/itinerary/itinerary-tabs';
import { PanelMap } from '@/components/panels/map/panel-map';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

type ItineraryPanelProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');

  return (
    <div className="absolute inset-0">
      <div className="absolute top-6 left-6 z-20">
        <ItineraryTabs value={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'overview' ? (
        <PanelMap view={view} />
      ) : (
        <ExcursionsPanel itinerary={view.itinerary} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings on the new file.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/itinerary-panel.tsx
git commit -m "feat(itinerary): add ItineraryPanel to switch Overview/Excursions"
```

---

### Task 4: Wire `ItineraryView` to `ItineraryPanel`

**Files:**
- Modify: `components/agent-ui/views/itinerary-view.tsx` (full current content below)

**Interfaces:**
- Consumes: `ItineraryPanel` from Task 3 (`@/components/panels/itinerary/itinerary-panel`).
- Produces: nothing new — `ItineraryView`'s exported signature is unchanged (`{ view: Extract<UiView, { type: 'itinerary' }> }`), so `view-registry.ts` needs no changes.

Current content of `components/agent-ui/views/itinerary-view.tsx`:

```tsx
'use client';

import { PanelMap } from '@/components/panels/map/panel-map';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function ItineraryView({ view }: { view: Extract<UiView, { type: 'itinerary' }> }) {
  return <PanelMap view={view} />;
}
```

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```tsx
'use client';

import { ItineraryPanel } from '@/components/panels/itinerary/itinerary-panel';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function ItineraryView({ view }: { view: Extract<UiView, { type: 'itinerary' }> }) {
  return <ItineraryPanel view={view} />;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings.

- [ ] **Step 4: Run the existing test suite**

Run: `pnpm test`
Expected: all existing tests still pass (this change touches no file under `lib/`, so no test should be affected).

- [ ] **Step 5: Commit**

```bash
git add components/agent-ui/views/itinerary-view.tsx
git commit -m "feat(itinerary): render ItineraryPanel from ItineraryView"
```

- [ ] **Step 6: Manual verification (dev panel)**

Per `conventions/testing.md`, UI is verified visually, not via automated component tests. Run locally and check:

Run: `pnpm dev`

Then in the browser:
1. Open the dev panel (bottom-right "dev" button), pick view `itinerary`, mock `danube_legends` (or `danube_legends_detail`), click Apply.
2. Confirm the pill bar appears top-left, with "Overview" selected (sage green) and "Excursions" unselected (tan).
3. Click "Excursions": the map disappears entirely; the cruise hero card (with `/hero-image.jpg`) appears on the left, and a scrollable list of experiences from Budapest, Bratislava, and Vienna (e.g. "Signature Budapest: Private Concert at Horse Railway Cultural Center") appears on the right.
4. Expand an experience (chevron) — it shows its description/day selector; clicking "Confirm" does not throw and does not need to hit the network (no intent is sent).
5. Click "Overview": the map reappears exactly as it was before switching tabs.

This step has no pass/fail command output to paste — confirm each point visually and note any mismatch before moving on.

---

## Plan Self-Review

- **Spec coverage:** Pill bar (Task 1) ✓, Excursions content reusing `CityExperiencesPanel` + hardcoded hero card (Task 2) ✓, tab-switching container replacing the map (Task 3) ✓, wiring into the existing view (Task 4) ✓. "Food & Drink" pill and agent-driven tab control are explicitly out of scope per the spec — no task builds them.
- **No placeholders:** every step has complete, exact code — no "TBD"/"similar to Task N".
- **Type consistency:** `ItineraryTab` defined once in Task 1, imported (not redefined) in Task 3. `ItineraryPanelProps.view` and `ExcursionsPanelProps.itinerary` types match `UiView`'s `itinerary` variant (`ItineraryFull | undefined`) throughout.
