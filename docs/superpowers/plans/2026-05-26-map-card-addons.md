# Map Card Add-Ons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-city add-on list to the map's `CityCard` with `Confirm` / `Reject` actions, with decisions stored in `uiViewStore` so styling iterations are possible against real DOM.

**Architecture:** Static `AddOn[]` lives on `City` in `lib/map/cities.ts`. The `itinerary` view in `uiViewStore` carries a `Record<addOnId, 'confirmed' | 'rejected'>` (analogous to `cabin_selection.detailCabinId`). `CityCard` reads/writes that record via a new `setAddOnDecision` store action.

**Tech Stack:** Next.js (App Router), React, Zustand, Tailwind v4, shadcn/ui primitives, Vitest + Testing Library.

**Spec:** `docs/2026-05-26-map-card-addons-design.md`

---

## File Structure

**Modify:**
- `lib/map/cities.ts` — add `AddOn` type, add `addOns?: AddOn[]` to `City`, populate Vienna and Bratislava.
- `lib/agent-ui/ui-view-types.ts` — add `AddOnDecision`, widen `itinerary` variant with required `addOnDecisions`.
- `lib/agent-ui/ui-view-store.ts` — add `setAddOnDecision(addOnId, decision)` action.
- `lib/agent-ui/ui-view-store.test.ts` — fix existing `{ type: 'itinerary' }` literal; add cases for `setAddOnDecision`.
- `lib/dev/mocks.ts` — fix existing `itinerary` mock to include `addOnDecisions: {}`.
- `components/panels/map/city-card.tsx` — render add-on list and wire up actions.

**Note on tests:** the project's vitest config is `environment: 'node'` and `include: ['lib/**/*.test.ts']`. There are no existing component tests, jsdom, or `@testing-library/react`. Setting that up is out of scope for this feature (YAGNI per `CLAUDE.md`). Card behavior is verified by the store unit tests (Task 3) plus the manual smoke test (Task 5).

---

## Task 1: Add `AddOn` type and seed data

**Files:**
- Modify: `lib/map/cities.ts`

- [ ] **Step 1: Replace the file with the new shape and seed data**

`lib/map/cities.ts`:

```ts
export type AddOn = {
  id: string;
  day: string;
  title: string;
};

export type City = {
  id: string;
  name: string;
  country: string;
  image: string;
  days: string;
  lon: number;
  lat: number;
  addOns?: AddOn[];
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
    addOns: [
      {
        id: 'vienna-chamber-music',
        day: 'Day 1',
        title: 'A private evening of chamber music at Palais Eschenbach.',
      },
    ],
  },
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovakia',
    image: '/map/bratislava.png',
    days: 'Days 3 & 4',
    lon: 17.1077,
    lat: 48.1486,
    addOns: [
      {
        id: 'bratislava-chamber-music',
        day: 'Day 1',
        title: 'A private evening of chamber music at Palais Eschenbach.',
      },
    ],
  },
  {
    id: 'wachau-valley',
    name: 'Wachau Valley',
    country: 'Austria',
    image: '/map/wachau-valley.png',
    days: 'Days 5, 6 & 7',
    lon: 15.4214,
    lat: 48.3797,
  },
];
```

- [ ] **Step 2: Type-check the project**

Run: `pnpm tsc --noEmit`
Expected: PASS (no new type errors).

- [ ] **Step 3: Commit**

```bash
git add lib/map/cities.ts
git commit -m "feat(map): add AddOn type and seed data on cities"
```

---

## Task 2: Widen `itinerary` view with `addOnDecisions`

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`
- Modify: `lib/agent-ui/ui-view-store.test.ts`
- Modify: `lib/dev/mocks.ts`

- [ ] **Step 1: Update the type**

In `lib/agent-ui/ui-view-types.ts`, replace `| { type: 'itinerary' }` with:

```ts
export type AddOnDecision = 'confirmed' | 'rejected';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; images: DreamImage[] }
  | { type: 'itinerary'; addOnDecisions: Record<string, AddOnDecision> }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection'; detailCabinId?: string };
```

Keep the existing `BookingSummary` re-export at the bottom of the file untouched.

- [ ] **Step 2: Run the type checker to surface every call site**

Run: `pnpm tsc --noEmit`
Expected: FAIL with errors in `lib/dev/mocks.ts:40` and `lib/agent-ui/ui-view-store.test.ts:214` (the two `{ type: 'itinerary' }` literals).

- [ ] **Step 3: Fix the dev mock**

In `lib/dev/mocks.ts`, change line 40 from:

```ts
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary' } }],
```

to:

```ts
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary', addOnDecisions: {} } }],
```

- [ ] **Step 4: Fix the existing store test**

In `lib/agent-ui/ui-view-store.test.ts`, change line 214 from:

```ts
      store.getState().setViewFromDev({ type: 'itinerary' });
```

to:

```ts
      store.getState().setViewFromDev({ type: 'itinerary', addOnDecisions: {} });
```

- [ ] **Step 5: Type-check again**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Run the existing test suite to confirm no regressions**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.test.ts lib/dev/mocks.ts
git commit -m "feat(agent-ui): widen itinerary view with addOnDecisions"
```

---

## Task 3: Add `setAddOnDecision` to the store (TDD)

**Files:**
- Modify: `lib/agent-ui/ui-view-store.test.ts`
- Modify: `lib/agent-ui/ui-view-store.ts`

- [ ] **Step 1: Write failing tests**

Append a new `describe` block at the end of the `describe('ui-view-store', ...)` body in `lib/agent-ui/ui-view-store.test.ts`, **inside the outer `describe`** (after the `describe('cabin detail', ...)` block, before the outer `})`):

```ts
  describe('add-on decisions', () => {
    it('setAddOnDecision writes confirmed into the active itinerary view', () => {
      store.getState().setViewFromUser({ type: 'itinerary', addOnDecisions: {} });
      store.getState().setAddOnDecision('vienna-chamber-music', 'confirmed');
      expect(store.getState().view).toEqual({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      expect(store.getState().source).toBe('user');
    });

    it('setAddOnDecision writes rejected and overwrites prior decisions', () => {
      store.getState().setViewFromUser({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      store.getState().setAddOnDecision('vienna-chamber-music', 'rejected');
      expect(store.getState().view).toEqual({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'rejected' },
      });
    });

    it('setAddOnDecision is a no-op when the active view is not itinerary', () => {
      store.getState().setViewFromUser({ type: 'presentation' });
      store.getState().setAddOnDecision('vienna-chamber-music', 'confirmed');
      expect(store.getState().view).toEqual({ type: 'presentation' });
    });

    it('re-entering the itinerary view resets addOnDecisions', () => {
      store.getState().setViewFromUser({
        type: 'itinerary',
        addOnDecisions: { 'vienna-chamber-music': 'confirmed' },
      });
      store.getState().setViewFromUser({ type: 'presentation' });
      store.getState().setViewFromUser({ type: 'itinerary', addOnDecisions: {} });
      expect(store.getState().view).toEqual({ type: 'itinerary', addOnDecisions: {} });
    });
  });
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts -t "add-on decisions"`
Expected: FAIL — `setAddOnDecision` is not a function on the store state.

- [ ] **Step 3: Add the action to the store interface and implementation**

In `lib/agent-ui/ui-view-store.ts`:

a) Add the type import for `AddOnDecision`. Change the import line at the top from:

```ts
import type { BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';
```

to:

```ts
import type { AddOnDecision, BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';
```

b) Add the method signature inside the `UiViewState` interface, immediately after the `recordParseError` line:

```ts
  setAddOnDecision: (addOnId: string, decision: AddOnDecision) => void;
```

c) Add the implementation inside the `createStore` factory, immediately after `recordParseError: (err) => set({ lastError: err }),`:

```ts
    setAddOnDecision: (addOnId, decision) =>
      set((state) => {
        if (state.view.type !== 'itinerary') return {};
        return {
          view: {
            type: 'itinerary',
            addOnDecisions: { ...state.view.addOnDecisions, [addOnId]: decision },
          },
          source: 'user',
        };
      }),
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: all tests pass (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): add setAddOnDecision action to ui-view store"
```

---

## Task 4: Render add-on blocks in `CityCard`

**Files:**
- Modify: `components/panels/map/city-card.tsx`

- [ ] **Step 1: Replace `city-card.tsx` with the add-on-aware version**

Replace the full contents of `components/panels/map/city-card.tsx` with:

```tsx
import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AddOn, City } from '@/lib/map/cities';
import { useUiViewStore } from '@/lib/agent-ui/ui-view-store';
import type { AddOnDecision } from '@/lib/agent-ui/ui-view-types';

// Fixed card width in px. Shared with the cluster layer so its grouping
// threshold stays in sync with the actual rendered card size.
export const CITY_CARD_WIDTH = 220;

type CityCardProps = {
  city: City;
  interactive?: boolean;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, interactive = true, onExpand }: CityCardProps) {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 gap-0 overflow-hidden rounded-2xl p-2.5 shadow-none"
      style={{ width: CITY_CARD_WIDTH }}
    >
      <div className="relative">
        <Image
          src={city.image}
          alt={city.name}
          width={200}
          height={130}
          className="h-[130px] w-full rounded-lg object-cover"
        />
        <span className="bg-beige-200 text-primary absolute top-2 left-2 rounded-full px-3 py-1 text-sm whitespace-nowrap">
          {city.days}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-base leading-tight">{city.name}</p>
          <p className="text-muted-foreground text-sm">{city.country}</p>
        </div>
        {interactive && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Expand ${city.name}`}
            onClick={() => onExpand?.(city)}
          >
            <ArrowsOutSimpleIcon weight="bold" />
          </Button>
        )}
      </div>
      {city.addOns && city.addOns.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {city.addOns.map((addOn) => (
            <AddOnBlock key={addOn.id} addOn={addOn} interactive={interactive} />
          ))}
        </div>
      )}
    </Card>
  );
}

type AddOnBlockProps = {
  addOn: AddOn;
  interactive: boolean;
};

function AddOnBlock({ addOn, interactive }: AddOnBlockProps) {
  const decision = useUiViewStore((s) =>
    s.view.type === 'itinerary' ? s.view.addOnDecisions[addOn.id] : undefined
  );
  const setAddOnDecision = useUiViewStore((s) => s.setAddOnDecision);

  return (
    <div
      data-testid={`add-on-${addOn.id}`}
      className="bg-beige-100 rounded-xl p-3"
    >
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Add-On</span>
        <span>{addOn.day}</span>
      </div>
      <p className="text-primary mt-2 text-sm leading-snug">{addOn.title}</p>
      {interactive && <AddOnActions addOnId={addOn.id} decision={decision} onDecide={setAddOnDecision} />}
    </div>
  );
}

type AddOnActionsProps = {
  addOnId: string;
  decision: AddOnDecision | undefined;
  onDecide: (addOnId: string, decision: AddOnDecision) => void;
};

function AddOnActions({ addOnId, decision, onDecide }: AddOnActionsProps) {
  if (decision === 'confirmed') {
    return <p className="text-primary mt-3 text-xs">Confirmed</p>;
  }
  if (decision === 'rejected') {
    return <p className="text-muted-foreground mt-3 text-xs">Rejected</p>;
  }
  return (
    <div className="mt-3 flex gap-2">
      <Button type="button" size="sm" onClick={() => onDecide(addOnId, 'confirmed')}>
        Confirm
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onDecide(addOnId, 'rejected')}
      >
        Reject
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Run the whole vitest suite to confirm no regression**

Run: `pnpm vitest run`
Expected: all tests pass.

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: PASS (or only pre-existing warnings).

- [ ] **Step 5: Commit**

```bash
git add components/panels/map/city-card.tsx
git commit -m "feat(map): render add-on list with confirm/reject in CityCard"
```

---

## Task 5: Manual visual check in the dev panel

This task is intentionally manual — the user explicitly wants to see the cards on the map to iterate on styling.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server listens on `http://localhost:3000` (or as configured).

- [ ] **Step 2: Open the app and switch to the itinerary view**

In the dev panel, select the `itinerary` mock (`Map`). Vienna and Bratislava cards should now show an "Add-On" block below the city name/country with the day label on the right and the chamber-music copy underneath. Wachau Valley should show no add-on block.

- [ ] **Step 3: Smoke-test the interactions**

Click `Confirm` on Vienna's add-on → buttons replaced by "Confirmed".
Click `Reject` on Bratislava's add-on → buttons replaced by "Rejected".
Switch to any other view and back to `Map` → decisions reset (expected per spec).

- [ ] **Step 4: Stop the server** when finished.

(No commit for this task — it is verification only.)

---

## Done criteria

- `pnpm tsc --noEmit` passes.
- `pnpm vitest run` passes (all existing + the new add-on tests).
- Manual smoke test in the dev panel (Task 5) behaves as described.
- Branch `feat/map-card-addons` has commits for: spec, type+seed, view widening, store action, CityCard render.
