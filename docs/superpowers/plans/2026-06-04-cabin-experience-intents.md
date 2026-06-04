# Cabin & Experience Intents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the missing cabin/experience intents and commands from `docs/frontend-integration.md` (no basket view): emit `select_cabin` + `select_experience`, and react to `show_experience_detail`, `add_cabin_to_basket`, `add_experience_to_basket`.

**Architecture:** Pure extension of the existing agent-UI contract. New commands are Zod-validated in `lib/agent-ui/commands.ts` and handled in the `applyCommand` reducer (`lib/agent-ui/ui-view-store.ts`); new intents are emitted with the existing `useFrontendIntent` hook. The `add_*_to_basket` commands drive per-card "selected/added" feedback via two new top-level store fields — there is no basket UI.

**Tech Stack:** Next.js, TypeScript, Zod, Zustand, Vitest, React, Tailwind, Radix Dialog.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `lib/agent-ui/commands.ts` | Zod command schemas + `UiCommand` union | Add 3 commands |
| `lib/agent-ui/ui-view-types.ts` | `UiView` shape | Add `detailExperienceId` to `itinerary` |
| `lib/agent-ui/ui-view-store.ts` | Reducer + store state | Add `selectedCabinId`, `addedExperiences`, 3 reducer cases |
| `lib/agent-ui/hooks.ts` | Store selector hooks | Add `useSelectedCabinId`, `useAddedExperiences` |
| `components/panels/cabin/cabin-detail-modal.tsx` | Cabin detail modal | Add "Select this suite" button |
| `components/panels/cabin/panel-cabin-selection.tsx` | Cabin panel | Emit `select_cabin`, pass selected state |
| `components/panels/map/experience-card.tsx` | Experience card | Day selector + wire Confirm → `select_experience` |
| `components/panels/map/city-experiences-panel.tsx` | Experience list | Backend-overridable open card, thread new props |
| `components/panels/map/panel-map.tsx` | Map panel | Compute day options, emit `select_experience` |
| `lib/agent-ui/commands.test.ts` | Schema tests | Add cases for 3 commands |
| `lib/agent-ui/ui-view-store.test.ts` | Reducer tests | Add cases for 3 commands |
| `lib/agent-ui/frontend-intent.test.ts` | Intent envelope tests | Add `select_cabin` / `select_experience` cases |

---

## Task 1: `show_experience_detail` command

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Modify: `lib/agent-ui/ui-view-types.ts`
- Modify: `lib/agent-ui/ui-view-store.ts`
- Test: `lib/agent-ui/commands.test.ts`, `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing schema test**

Add to `lib/agent-ui/commands.test.ts` inside `describe('UiCommand schema', ...)`:

```ts
it('parses show_experience_detail with an experience_id', () => {
  const result = UiCommand.parse({
    type: 'show_experience_detail',
    correlationId: 'c-exp-1',
    payload: { experience_id: 'signature_vienna_belvedere_palace' },
  });
  if (result.type !== 'show_experience_detail') throw new Error('discriminator failed');
  expect(result.payload.experience_id).toBe('signature_vienna_belvedere_palace');
});

it('parses show_experience_detail with a null experience_id (close)', () => {
  const result = UiCommand.parse({
    type: 'show_experience_detail',
    correlationId: 'c-exp-2',
    payload: { experience_id: null },
  });
  if (result.type !== 'show_experience_detail') throw new Error('discriminator failed');
  expect(result.payload.experience_id).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: FAIL — `show_experience_detail` is not a member of the union (`Invalid discriminator value`).

- [ ] **Step 3: Add the schema and union member**

In `lib/agent-ui/commands.ts`, add after `ShowCabinDetail` (around line 143):

```ts
const ShowExperienceDetail = Base.extend({
  type: z.literal('show_experience_detail'),
  payload: z.object({ experience_id: z.string().nullable() }),
});
```

Then add it to the `UiCommand` union (around line 150):

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
]);
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the view field**

In `lib/agent-ui/ui-view-types.ts`, extend the `itinerary` variant (currently lines 13-17):

```ts
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      detailCityId?: string;
      detailExperienceId?: string;
    }
```

- [ ] **Step 6: Write the failing reducer test**

Add to `lib/agent-ui/ui-view-store.test.ts` inside `describe('ui-view-store', ...)`:

```ts
it('applyCommand(show_experience_detail) sets detailExperienceId on the itinerary view', () => {
  store.getState().setViewFromUser({ type: 'itinerary', detailCityId: 'vienna' });
  store.getState().applyCommand({
    type: 'show_experience_detail',
    correlationId: 'c-exp-1',
    payload: { experience_id: 'belvedere' },
  });
  const s = store.getState();
  if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
  expect(s.view.detailExperienceId).toBe('belvedere');
  expect(s.view.detailCityId).toBe('vienna');
  expect(s.source).toBe('agent');
  expect(s.lastCorrelationId).toBe('c-exp-1');
});

it('applyCommand(show_experience_detail) with null clears detailExperienceId', () => {
  store.getState().setViewFromUser({ type: 'itinerary', detailExperienceId: 'belvedere' });
  store.getState().applyCommand({
    type: 'show_experience_detail',
    correlationId: 'c-exp-2',
    payload: { experience_id: null },
  });
  const s = store.getState();
  if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
  expect(s.view.detailExperienceId).toBeUndefined();
});

it('applyCommand(show_experience_detail) is ignored when not on the itinerary view', () => {
  store.getState().applyCommand({
    type: 'show_experience_detail',
    correlationId: 'c-exp-3',
    payload: { experience_id: 'belvedere' },
  });
  const s = store.getState();
  expect(s.view).toEqual({ type: 'start' });
  expect(s.lastCorrelationId).toBe('c-exp-3');
});
```

- [ ] **Step 7: Run the reducer test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — no `case 'show_experience_detail'`, so `detailExperienceId` stays undefined / type error on exhaustive switch.

- [ ] **Step 8: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, add inside the `switch (cmd.type)` block, after the `show_city_detail` case (around line 104), mirroring `show_cabin_detail`:

```ts
          case 'show_experience_detail': {
            if (state.view.type !== 'itinerary') {
              return { source: 'agent', lastCorrelationId: cmd.correlationId };
            }
            return {
              view: { ...state.view, detailExperienceId: cmd.payload.experience_id ?? undefined },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlationId,
            };
          }
```

- [ ] **Step 9: Run both test files to verify they pass**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): handle show_experience_detail command"
```

---

## Task 2: `add_cabin_to_basket` command + `selectedCabinId` state

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/commands.test.ts`, `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing schema test**

Add to `lib/agent-ui/commands.test.ts`:

```ts
it('parses add_cabin_to_basket with a full payload', () => {
  const result = UiCommand.parse({
    type: 'add_cabin_to_basket',
    correlationId: 'c-cab-1',
    payload: {
      cabin_id: 'mozart-suite',
      name: 'Mozart Suite',
      category: 'Mozart Suite',
      guests: 2,
      area: 62,
      price_from: null,
      view: 'French Balcony',
    },
  });
  if (result.type !== 'add_cabin_to_basket') throw new Error('discriminator failed');
  expect(result.payload.cabin_id).toBe('mozart-suite');
  expect(result.payload.price_from).toBeNull();
});

it('rejects add_cabin_to_basket without cabin_id', () => {
  const result = UiCommand.safeParse({
    type: 'add_cabin_to_basket',
    correlationId: 'c-cab-2',
    payload: { name: 'Mozart Suite', category: 'x', guests: 2, area: 62, price_from: null, view: 'y' },
  });
  expect(result.success).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: FAIL — `add_cabin_to_basket` not in union.

- [ ] **Step 3: Add the schema and union member**

In `lib/agent-ui/commands.ts`, add after `ShowExperienceDetail`:

```ts
const AddCabinToBasket = Base.extend({
  type: z.literal('add_cabin_to_basket'),
  payload: z.object({
    cabin_id: z.string(),
    name: z.string(),
    category: z.string(),
    guests: z.number().int(),
    area: z.number(),
    price_from: z.number().nullable(),
    view: z.string(),
  }),
});
```

Add `AddCabinToBasket,` to the `UiCommand` union list.

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `selectedCabinId` to store state**

In `lib/agent-ui/ui-view-store.ts`:

Add to the `UiViewState` interface (after `bookingSummary: BookingSummary | null;`, line 12):

```ts
  selectedCabinId: string | null;
```

Add to the initial state object (after `bookingSummary: null,`, line 30):

```ts
    selectedCabinId: null,
```

- [ ] **Step 6: Write the failing reducer test**

Add to `lib/agent-ui/ui-view-store.test.ts`:

```ts
it('applyCommand(add_cabin_to_basket) sets selectedCabinId', () => {
  store.getState().applyCommand({
    type: 'add_cabin_to_basket',
    correlationId: 'c-cab-1',
    payload: {
      cabin_id: 'mozart-suite',
      name: 'Mozart Suite',
      category: 'Mozart Suite',
      guests: 2,
      area: 62,
      price_from: null,
      view: 'French Balcony',
    },
  });
  const s = store.getState();
  expect(s.selectedCabinId).toBe('mozart-suite');
  expect(s.source).toBe('agent');
  expect(s.lastCorrelationId).toBe('c-cab-1');
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `selectedCabinId` stays `null`.

- [ ] **Step 8: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, add after the `show_experience_detail` case:

```ts
          case 'add_cabin_to_basket':
            return {
              selectedCabinId: cmd.payload.cabin_id,
              source: 'agent',
              lastCorrelationId: cmd.correlationId,
            };
```

- [ ] **Step 9: Add the selector hook**

In `lib/agent-ui/hooks.ts`, add:

```ts
export const useSelectedCabinId = () => useUiViewStore((s) => s.selectedCabinId);
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/hooks.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): handle add_cabin_to_basket command"
```

---

## Task 3: `add_experience_to_basket` command + `addedExperiences` state

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/commands.test.ts`, `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing schema test**

Add to `lib/agent-ui/commands.test.ts`:

```ts
it('parses add_experience_to_basket', () => {
  const result = UiCommand.parse({
    type: 'add_experience_to_basket',
    correlationId: 'c-exp-add-1',
    payload: {
      experience_id: 'signature_vienna_belvedere_palace',
      day: 'Day 3',
      passenger_count: 2,
    },
  });
  if (result.type !== 'add_experience_to_basket') throw new Error('discriminator failed');
  expect(result.payload.day).toBe('Day 3');
  expect(result.payload.passenger_count).toBe(2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: FAIL — `add_experience_to_basket` not in union.

- [ ] **Step 3: Add the schema and union member**

In `lib/agent-ui/commands.ts`, add after `AddCabinToBasket`:

```ts
const AddExperienceToBasket = Base.extend({
  type: z.literal('add_experience_to_basket'),
  payload: z.object({
    experience_id: z.string(),
    day: z.string(),
    passenger_count: z.number().int(),
  }),
});
```

Add `AddExperienceToBasket,` to the `UiCommand` union list.

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `addedExperiences` to store state**

In `lib/agent-ui/ui-view-store.ts`:

Add to the `UiViewState` interface (after `selectedCabinId: string | null;`):

```ts
  addedExperiences: Array<{ experienceId: string; day: string }>;
```

Add to the initial state object (after `selectedCabinId: null,`):

```ts
    addedExperiences: [],
```

- [ ] **Step 6: Write the failing reducer test (append + idempotency)**

Add to `lib/agent-ui/ui-view-store.test.ts`:

```ts
it('applyCommand(add_experience_to_basket) appends an entry', () => {
  store.getState().applyCommand({
    type: 'add_experience_to_basket',
    correlationId: 'c-exp-add-1',
    payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
  });
  expect(store.getState().addedExperiences).toEqual([{ experienceId: 'belvedere', day: 'Day 3' }]);
});

it('applyCommand(add_experience_to_basket) is idempotent for the same (id, day)', () => {
  const add = () =>
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'c-exp-add-2',
      payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
    });
  add();
  add();
  expect(store.getState().addedExperiences).toEqual([{ experienceId: 'belvedere', day: 'Day 3' }]);
});

it('applyCommand(add_experience_to_basket) keeps separate entries for different days', () => {
  store.getState().applyCommand({
    type: 'add_experience_to_basket',
    correlationId: 'c-exp-add-3',
    payload: { experience_id: 'belvedere', day: 'Day 3', passenger_count: 2 },
  });
  store.getState().applyCommand({
    type: 'add_experience_to_basket',
    correlationId: 'c-exp-add-4',
    payload: { experience_id: 'belvedere', day: 'Day 5', passenger_count: 2 },
  });
  expect(store.getState().addedExperiences).toEqual([
    { experienceId: 'belvedere', day: 'Day 3' },
    { experienceId: 'belvedere', day: 'Day 5' },
  ]);
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `addedExperiences` stays `[]`.

- [ ] **Step 8: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, add after the `add_cabin_to_basket` case:

```ts
          case 'add_experience_to_basket': {
            const { experience_id, day } = cmd.payload;
            const exists = state.addedExperiences.some(
              (e) => e.experienceId === experience_id && e.day === day
            );
            return {
              addedExperiences: exists
                ? state.addedExperiences
                : [...state.addedExperiences, { experienceId: experience_id, day }],
              source: 'agent',
              lastCorrelationId: cmd.correlationId,
            };
          }
```

- [ ] **Step 9: Add the selector hook**

In `lib/agent-ui/hooks.ts`, add:

```ts
export const useAddedExperiences = () => useUiViewStore((s) => s.addedExperiences);
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/hooks.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): handle add_experience_to_basket command"
```

---

## Task 4: Emit `select_cabin` + "Select this suite" button

**Files:**
- Modify: `components/panels/cabin/cabin-detail-modal.tsx`
- Modify: `components/panels/cabin/panel-cabin-selection.tsx`
- Test: `lib/agent-ui/frontend-intent.test.ts`

- [ ] **Step 1: Write the failing intent-envelope test**

Add to `lib/agent-ui/frontend-intent.test.ts` inside `describe('buildFrontendIntent', ...)`:

```ts
it('builds a select_cabin envelope with cabin_id', () => {
  const env = buildFrontendIntent('select_cabin', {
    entities: { cabin_id: 'mozart-suite' },
    userMessage: 'User selected Mozart Suite',
  });
  expect(env.intent).toBe('select_cabin');
  expect(env.entities).toEqual({ cabin_id: 'mozart-suite' });
});
```

- [ ] **Step 2: Run the test to verify it passes (regression guard)**

Run: `pnpm exec vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: PASS — `buildFrontendIntent` is generic; this test documents the exact `select_cabin` shape the UI must emit.

- [ ] **Step 3: Add `onSelect` + `selected` props to the modal**

Replace the contents of `components/panels/cabin/cabin-detail-modal.tsx` with:

```tsx
import { ArmchairIcon, BathtubIcon, BedIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
// Radix dialog primitives directly, not the shadcn Dialog wrapper: that wrapper
// hardcodes a fixed, body-portaled, viewport-wide overlay. This detail view must
// stay confined to the cabin panel, so it renders inline (no Portal) with
// modal={false} — keeping the bottom bar and voice input interactive.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { DetailSection } from '@/components/panels/cabin/cabin-detail-section';
import { PipeSeparatedList } from '@/components/shared/pipe-separated-list';
import { Button } from '@/components/ui/button';
import type { Cabin } from '@/lib/agent-ui/commands';
import { formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
  onSelect: (cabin: Cabin) => void;
  selected: boolean;
};

export function CabinDetailModal({ cabin, onClose, onSelect, selected }: CabinDetailModalProps) {
  return (
    <DialogPrimitive.Root
      open={cabin != null}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
    >
      {cabin && (
        <DialogPrimitive.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="bg-beige-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 absolute inset-0 flex flex-col overflow-y-auto pt-16 outline-none lg:flex-row lg:overflow-hidden"
        >
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:flex-1">
            <CabinDetailGallery images={cabin.detail.gallery} alt={cabin.name} />
          </div>
          <div className="flex flex-col p-6 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <DialogPrimitive.Title className="font-display text-3xl leading-tight font-semibold text-neutral-700">
                {cabin.name}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="text-muted-foreground hover:bg-beige-300 focus-visible:ring-ring/50 -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:text-neutral-700 focus-visible:ring-[3px]"
              >
                <XIcon size={18} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              {cabin.name} cabin details
            </DialogPrimitive.Description>
            <PipeSeparatedList
              items={[
                `${cabin.guests} guests`,
                `${cabin.area}m²`,
                `from ${formatCabinPrice(cabin.price_from)} EUR`,
                cabin.view,
              ]}
              className="mt-2 gap-x-3 gap-y-1"
            />
            <div className="mt-6 flex flex-col gap-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={cabin.detail.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={cabin.detail.bathroom} />
              <DetailSection icon={ArmchairIcon} title="Amenities" items={cabin.detail.amenities} />
            </div>
            <Button
              type="button"
              className="mt-8"
              disabled={selected}
              onClick={() => onSelect(cabin)}
            >
              {selected ? (
                <>
                  <CheckIcon weight="bold" /> Selected
                </>
              ) : (
                'Select this suite'
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      )}
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 4: Wire the panel to emit `select_cabin`**

Replace the contents of `components/panels/cabin/panel-cabin-selection.tsx` with:

```tsx
'use client';

import { useCallback } from 'react';
import { CabinCard } from '@/components/panels/cabin/cabin-card';
import { CabinDetailModal } from '@/components/panels/cabin/cabin-detail-modal';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Cabin } from '@/lib/agent-ui/commands';
import { useSelectedCabinId, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

type PanelCabinSelectionProps = {
  view: Extract<UiView, { type: 'cabin_selection' }>;
};

export function PanelCabinSelection({ view }: PanelCabinSelectionProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const selectedCabinId = useSelectedCabinId();

  const { cabins } = view;

  const handleExpand = useCallback(
    (cabin: Cabin) => {
      setViewFromUser({ type: 'cabin_selection', cabins, detailCabinId: cabin.id });
      void sendIntent('explore_cabin', {
        entities: { cabin_id: cabin.id },
        userMessage: `User opened ${cabin.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, cabins]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'cabin_selection', cabins });
    void sendIntent('view_cabin_selection', {
      userMessage: 'User closed cabin detail',
    });
  }, [setViewFromUser, sendIntent, cabins]);

  const handleSelect = useCallback(
    (cabin: Cabin) => {
      void sendIntent('select_cabin', {
        entities: { cabin_id: cabin.id },
        userMessage: `User selected ${cabin.name}`,
      });
    },
    [sendIntent]
  );

  const detailCabin = view.detailCabinId
    ? (cabins.find((cabin) => cabin.id === view.detailCabinId) ?? null)
    : null;

  return (
    <div className="bg-beige-200 relative h-full w-full overflow-hidden">
      <div className="h-full overflow-y-auto" inert={detailCabin != null}>
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-10 p-6 pt-16 sm:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-3">
          {cabins.map((cabin) => (
            <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
          ))}
        </div>
      </div>
      <CabinDetailModal
        cabin={detailCabin}
        onClose={handleClose}
        onSelect={handleSelect}
        selected={detailCabin != null && selectedCabinId === detailCabin.id}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify lint + types pass**

Run: `pnpm lint`
Expected: PASS (no errors).

- [ ] **Step 6: Run the intent test to confirm green**

Run: `pnpm exec vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/panels/cabin/cabin-detail-modal.tsx components/panels/cabin/panel-cabin-selection.tsx lib/agent-ui/frontend-intent.test.ts
git commit -m "feat(cabin): emit select_cabin and show selected state"
```

---

## Task 5: Emit `select_experience` + day selector + added feedback

**Files:**
- Modify: `components/panels/map/experience-card.tsx`
- Modify: `components/panels/map/city-experiences-panel.tsx`
- Modify: `components/panels/map/panel-map.tsx`
- Test: `lib/agent-ui/frontend-intent.test.ts`

- [ ] **Step 1: Write the failing intent-envelope test**

Add to `lib/agent-ui/frontend-intent.test.ts`:

```ts
it('builds a select_experience envelope with experience_id and day', () => {
  const env = buildFrontendIntent('select_experience', {
    entities: { experience_id: 'belvedere', day: 'Day 3' },
    userMessage: 'User added Belvedere Palace for Day 3',
  });
  expect(env.intent).toBe('select_experience');
  expect(env.entities).toEqual({ experience_id: 'belvedere', day: 'Day 3' });
});
```

- [ ] **Step 2: Run the test to verify it passes (shape guard)**

Run: `pnpm exec vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: PASS — documents the exact `select_experience` shape (no `passenger_count`; backend defaults it).

- [ ] **Step 3: Add day selector + Confirm wiring to `ExperienceCard`**

Replace the contents of `components/panels/map/experience-card.tsx` with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { cn } from '@/lib/shadcn/utils';

type ExperienceCardProps = {
  experience: Experience;
  expanded: boolean;
  onToggle: () => void;
  dayOptions: string[];
  addedDays: string[];
  onConfirm: (day: string) => void;
};

export function ExperienceCard({
  experience,
  expanded,
  onToggle,
  dayOptions,
  addedDays,
  onConfirm,
}: ExperienceCardProps) {
  const images = experience.images ?? (experience.image ? [experience.image] : []);
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0] ?? '');

  // On expand, nudge the scroll panel just enough to bring the now-taller card fully into view.
  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  const isAdded = addedDays.includes(selectedDay);

  return (
    <Card
      ref={cardRef}
      className="bg-beige-50 border-beige-400/50 flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
    >
      {expanded && images.length > 0 && <ExperienceGallery images={images} alt={experience.name} />}
      <div>
        <div className="flex grow items-center justify-between gap-2">
          <div className="text-primary text-base leading-snug font-medium">{experience.name}</div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0"
            aria-label={expanded ? `Collapse ${experience.name}` : `Expand ${experience.name}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <CaretDownIcon
              weight="bold"
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        </div>
        {experience.venue && (
          <p className="text-muted-foreground mt-1 text-sm">{experience.venue}</p>
        )}
        {expanded && (
          <p className="text-primary/80 mt-2 text-sm leading-relaxed">{experience.description}</p>
        )}
      </div>
      {expanded && (
        <div className="mt-3 flex items-center justify-between gap-2 px-2 pb-1">
          <label htmlFor={`day-${experience.id}`} className="sr-only">
            Day for {experience.name}
          </label>
          <select
            id={`day-${experience.id}`}
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            disabled={dayOptions.length === 0}
            className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-2 py-1 text-sm"
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            {/* Reject is not yet wired — no intent defined for it. */}
            <Button type="button" variant="ghost" size="sm" onClick={() => {}}>
              Reject
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isAdded || !selectedDay}
              onClick={() => onConfirm(selectedDay)}
            >
              {isAdded ? (
                <>
                  <CheckIcon weight="bold" /> Added
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ExperienceGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="mb-2 flex flex-col gap-2">
      <div className="relative h-36 w-full overflow-hidden rounded-lg">
        <Image src={activeSrc} alt={alt} fill sizes="440px" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition',
                index === activeIndex ? 'ring-primary ring-2' : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Thread props through `CityExperiencesPanel` (backend-overridable open card)**

Replace the contents of `components/panels/map/city-experiences-panel.tsx` with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ExperienceCard } from '@/components/panels/map/experience-card';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 440;

type CityExperiencesPanelProps = {
  experiences: Experience[];
  detailExperienceId: string | null;
  dayOptions: string[];
  addedExperiences: Array<{ experienceId: string; day: string }>;
  onConfirm: (experience: Experience, day: string) => void;
};

export function CityExperiencesPanel({
  experiences,
  detailExperienceId,
  dayOptions,
  addedExperiences,
  onConfirm,
}: CityExperiencesPanelProps) {
  // Local open state with a first-card default; a show_experience_detail command
  // from the backend overrides it via the effect below.
  const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade } = useScrollFade(scrollRef, [experiences]);

  useEffect(() => {
    if (detailExperienceId) {
      setOpenId(detailExperienceId);
    }
  }, [detailExperienceId]);

  return (
    <div
      className="pointer-events-auto relative flex h-full flex-col gap-3 pt-10"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="text-muted-foreground shrink-0 px-2 text-sm font-bold tracking-wide uppercase">
        Experiences
      </div>
      <div
        className={`pointer-events-none absolute top-[60px] right-0 left-0 z-1 h-[60px] bg-gradient-to-b from-[#E7DCD3] transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'} `}
      />
      <div
        className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2"
        ref={scrollRef}
      >
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            expanded={experience.id === openId}
            onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
            dayOptions={dayOptions}
            addedDays={addedExperiences
              .filter((e) => e.experienceId === experience.id)
              .map((e) => e.day)}
            onConfirm={(day) => onConfirm(experience, day)}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute right-0 bottom-0 left-0 z-1 h-[60px] bg-gradient-to-t from-[#EDE6DD] transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
      />
    </div>
  );
}
```

- [ ] **Step 5: Wire `panel-map.tsx` to compute day options and emit `select_experience`**

Replace the contents of `components/panels/map/panel-map.tsx` with:

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Experience } from '@/lib/agent-ui/commands';
import { useAddedExperiences, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

type PanelMapProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function PanelMap({ view }: PanelMapProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const addedExperiences = useAddedExperiences();

  const { itinerary, detailCityId, detailExperienceId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  const dayOptions =
    detailCity?.day_details?.map((d) => d.day) ?? (detailCity ? [detailCity.days] : []);

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary]);

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
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
      />
      {detailCity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
          <CityDetailCard city={detailCity} onClose={handleClose} />
          {detailCity.experiences && detailCity.experiences.length > 0 && (
            <CityExperiencesPanel
              experiences={detailCity.experiences}
              detailExperienceId={detailExperienceId ?? null}
              dayOptions={dayOptions}
              addedExperiences={addedExperiences}
              onConfirm={handleExperienceConfirm}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify lint + types pass**

Run: `pnpm lint`
Expected: PASS (no errors).

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test`
Expected: PASS (all suites green).

- [ ] **Step 8: Commit**

```bash
git add components/panels/map/experience-card.tsx components/panels/map/city-experiences-panel.tsx components/panels/map/panel-map.tsx lib/agent-ui/frontend-intent.test.ts
git commit -m "feat(experience): emit select_experience with day selector and added state"
```

---

## Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: PASS, no warnings or errors.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all suites green, including the new command, reducer, and intent tests.

- [ ] **Step 3: Confirm the contract coverage by grep**

Run: `grep -rn "show_experience_detail\|add_cabin_to_basket\|add_experience_to_basket\|select_cabin\|select_experience" lib/agent-ui components/panels`
Expected: each command appears in `commands.ts` + `ui-view-store.ts`; each intent appears in the relevant panel component.

---

## Self-Review notes

- **Spec coverage:** `show_experience_detail` (Task 1), `add_cabin_to_basket` (Task 2), `add_experience_to_basket` (Task 3), `select_cabin` (Task 4), `select_experience` + day selector + added feedback (Task 5). Out-of-scope items (basket, grid, `explore_experience`, `view_experience_selection`) are intentionally absent.
- **Refinement vs spec §3:** the spec said "drop the local `openId`"; the plan keeps a local `openId` with a sync effect on `detailExperienceId`. This is the literal "local default + backend override" behavior the user approved and is less invasive — single backend entry point (`view.detailExperienceId` set only by the command), local taps stay local with no intent.
- **Type consistency:** `selectedCabinId: string | null`, `addedExperiences: Array<{ experienceId: string; day: string }>`, `detailExperienceId?: string`, and hooks `useSelectedCabinId` / `useAddedExperiences` are used identically across reducer, hooks, and components.
- **Naming:** command `type` values are snake_case; store fields and props are camelCase, matching existing conventions.
