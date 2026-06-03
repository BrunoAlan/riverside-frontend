# City Experiences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the backend's per-city `experiences` into the itinerary UI (card badge + city detail list) and remove the dead add-ons machinery entirely.

**Architecture:** `experiences` is wire data carried on `ItineraryCity` (same place as `day_details`). The local `City` type gains an optional `experiences` field so the map card can read the count. Add-ons (type, mock data, store state, UI, tests) are ripped out across every layer.

**Tech Stack:** Next.js, TypeScript, Zod (wire schemas), Zustand (view store), Vitest (`environment: node`, only `lib/**/*.test.ts`). No component test infra exists — UI changes are verified with `pnpm lint` + `pnpm build` + the dev panel.

---

## Notes for the executor

- Package manager is **pnpm** — never `npm`/`yarn`.
- Tests only run from `lib/`. Card/detail/mock changes have no unit tests; verify them with `pnpm lint` and `pnpm build`.
- Branch is already `feat/city-experiences`. The working tree has a pre-existing unrelated change in `lib/agent-ui/transport.ts` — **do not stage it**; only `git add` the exact files listed per task.
- Tasks 1–4 are additive and keep the build green. The full add-ons ripout is the final coordinated task (Task 5).

---

### Task 1: Add the `Experience` wire schema

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the `describe('UiCommand schema', ...)` block in `lib/agent-ui/commands.test.ts`, right after the `rejects a malformed day_details entry` test (around line 266):

```ts
  it('parses show_itinerary_options with per-city experiences', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-experiences',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              experiences: [
                {
                  id: 'signature_vienna_belvedere_palace',
                  name: 'Signature Vienna: VIP Evening at Belvedere Palace',
                  type: 'private_concert_and_museum_visit',
                  venue: 'Belvedere Palace',
                  description: 'After-hours VIP experience at Belvedere Palace.',
                },
                {
                  id: 'signature_hungary_national_day',
                  name: 'Signature Hungary: National Day Celebration',
                  type: 'national_day_fireworks_event',
                  venue: null,
                  description: 'National Day celebration with fireworks from Vista Deck.',
                },
              ],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].experiences).toEqual([
      {
        id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        type: 'private_concert_and_museum_visit',
        venue: 'Belvedere Palace',
        description: 'After-hours VIP experience at Belvedere Palace.',
      },
      {
        id: 'signature_hungary_national_day',
        name: 'Signature Hungary: National Day Celebration',
        type: 'national_day_fireworks_event',
        venue: null,
        description: 'National Day celebration with fireworks from Vista Deck.',
      },
    ]);
  });

  it('rejects a malformed experience entry', () => {
    const parsed = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlationId: 'c-bad-exp',
      payload: {
        itinerary: {
          id: 'x',
          name: 'X',
          duration: { days: 1, nights: 0 },
          match_score: 1,
          departure_dates: [],
          center: [0, 0],
          zoom: 1,
          cities: [
            {
              id: 'a',
              name: 'A',
              country: 'C',
              image: 'https://example.com/a.jpg',
              days: 'Day 1',
              lon: 0,
              lat: 0,
              experiences: [{ id: 'e1', name: 'No description' }],
            },
          ],
        },
      },
    });
    expect(parsed.success).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: The new `parses ... experiences` test FAILS — Zod strips the unknown `experiences` key, so `cities[0].experiences` is `undefined` and the `toEqual` mismatches. (The `rejects a malformed experience entry` test may already pass because the unknown key is stripped — it locks in behavior after the schema lands.)

- [ ] **Step 3: Add the `Experience` schema**

In `lib/agent-ui/commands.ts`, add the `Experience` schema immediately above the `ItineraryCity` definition (above the `// A city as it travels ...` comment, around line 21):

```ts
export const Experience = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  venue: z.string().nullable(),
  description: z.string(),
});
export type Experience = z.infer<typeof Experience>;
```

Then update the `ItineraryCity` schema: change the comment and add the `experiences` field. Replace:

```ts
// A city as it travels inside an itinerary payload. Structurally a `City`
// (lib/map/cities.ts) minus the local-only `addOns`.
export const ItineraryCity = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  image: z.string(),
  days: z.string(),
  lon: z.number(),
  lat: z.number(),
  day_details: z.array(z.object({ day: z.string(), description: z.string() })).optional(),
});
```

with:

```ts
// A city as it travels inside an itinerary payload. Structurally a `City`
// (lib/map/cities.ts) plus the wire-only `day_details` and `experiences`.
export const ItineraryCity = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  image: z.string(),
  days: z.string(),
  lon: z.number(),
  lat: z.number(),
  day_details: z.array(z.object({ day: z.string(), description: z.string() })).optional(),
  experiences: z.array(Experience).optional(),
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: PASS (all tests, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat: parse per-city experiences in itinerary payload"
```

---

### Task 2: Show the experiences count on the map card

**Files:**
- Modify: `lib/map/cities.ts`
- Modify: `components/panels/map/city-card.tsx`

No unit test (presentational; the repo has no component tests). Verified by `pnpm lint` + `pnpm build`.

- [ ] **Step 1: Add `experiences` to the local `City` type**

In `lib/map/cities.ts`, add a type-only import at the top of the file (above `export type AddOn`):

```ts
import type { Experience } from '@/lib/agent-ui/commands';
```

Then add the optional `experiences` field to the `City` type. Change:

```ts
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
```

to:

```ts
export type City = {
  id: string;
  name: string;
  country: string;
  image: string;
  days: string;
  lon: number;
  lat: number;
  addOns?: AddOn[];
  experiences?: Experience[];
};
```

(`addOns` stays for now — it is removed in Task 5.)

- [ ] **Step 2: Drive the badge from `experiences`**

In `components/panels/map/city-card.tsx`, delete the mock constant and its comment (lines 13–14):

```ts
// TODO: replace with the real add-on count once it's wired to data.
const MOCK_ADD_ON_COUNT = 3;
```

Then replace the badge block. Change:

```tsx
      <div className="mt-3 flex justify-center">
        <span className="border-beige-300 text-muted-foreground rounded-full border px-3 py-1 text-xs whitespace-nowrap">
          {MOCK_ADD_ON_COUNT} excursions available
        </span>
      </div>
```

to:

```tsx
      {city.experiences && city.experiences.length > 0 && (
        <div className="mt-3 flex justify-center">
          <span className="border-beige-300 text-muted-foreground rounded-full border px-3 py-1 text-xs whitespace-nowrap">
            {city.experiences.length} experiences available
          </span>
        </div>
      )}
```

- [ ] **Step 3: Verify it compiles and lints**

Run: `pnpm build`
Expected: Build succeeds (no TypeScript errors).

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/map/cities.ts components/panels/map/city-card.tsx
git commit -m "feat: show experiences count on city card"
```

---

### Task 3: List experiences in the city detail card

**Files:**
- Modify: `components/panels/map/city-detail-card.tsx`

`CityDetailCard` already receives an `ItineraryCity`, which carries `experiences` after Task 1 — no import changes needed.

- [ ] **Step 1: Add the experiences section below `day_details`**

In `components/panels/map/city-detail-card.tsx`, the scroll container currently is:

```tsx
        <div className="mt-4 flex flex-col gap-4 overflow-y-auto px-2 pb-2">
          {city.day_details?.map((detail, i) => (
            <div key={`${detail.day}-${i}`}>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">{detail.day}</p>
              <p className="text-primary mt-2 text-sm leading-relaxed">{detail.description}</p>
            </div>
          ))}
        </div>
```

Replace it with (day_details first, experiences below):

```tsx
        <div className="mt-4 flex flex-col gap-4 overflow-y-auto px-2 pb-2">
          {city.day_details?.map((detail, i) => (
            <div key={`${detail.day}-${i}`}>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">{detail.day}</p>
              <p className="text-primary mt-2 text-sm leading-relaxed">{detail.description}</p>
            </div>
          ))}
          {city.experiences && city.experiences.length > 0 && (
            <div className="border-beige-300 mt-2 border-t pt-4">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Experiences</p>
              <div className="mt-3 flex flex-col gap-4">
                {city.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p className="text-primary text-sm leading-snug">{exp.name}</p>
                    {exp.venue && (
                      <p className="text-muted-foreground mt-1 text-xs">{exp.venue}</p>
                    )}
                    <p className="text-primary/80 mt-1 text-sm leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `pnpm build`
Expected: Build succeeds.

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/city-detail-card.tsx
git commit -m "feat: list city experiences in the detail card"
```

---

### Task 4: Use the full itinerary payload in the dev mock

**Files:**
- Modify: `lib/dev/mocks.ts`

This replaces the `danubeLegends` mock's `cities` and `departure_dates` with the full backend payload (six cities; Budapest ×3 and Vienna ×1 experiences, the rest none). The two `itinerary` view mocks keep `addOnDecisions: {}` for now (removed in Task 5).

- [ ] **Step 1: Replace the `danubeLegends` mock**

In `lib/dev/mocks.ts`, replace the entire `const danubeLegends = { ... };` block (from `const danubeLegends = {` through its closing `};`) with:

```ts
const danubeLegends = {
  id: 'danube_legends_from_budapest_to_vienna',
  name: 'Danube Legends from Budapest to Vienna',
  duration: { days: 12, nights: 11 },
  match_score: 0.6667,
  departure_dates: ['2026-04-22', '2026-05-06', '2026-05-20', '2026-09-02', '2026-09-16'],
  center: [16.570283333333332, 48.15495000000001] as [number, number],
  zoom: 6,
  cities: [
    {
      id: 'budapest',
      name: 'Budapest',
      country: 'Hungary',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 1, 2, 6 & 7',
      lon: 19.0402,
      lat: 47.4979,
      day_details: [
        {
          day: 'Day 01',
          description: 'Arrive in Budapest and embark. Evening welcome dinner aboard.',
        },
        { day: 'Day 02', description: 'Guided tour of Buda Castle and the Fisherman’s Bastion.' },
      ],
      experiences: [
        {
          id: 'signature_hungary_national_day',
          name: 'Signature Hungary: National Day Celebration',
          type: 'national_day_fireworks_event',
          venue: null,
          description:
            'Hungary National Day celebration with food, drinks, music and fireworks views from Vista Deck.',
        },
        {
          id: 'signature_budapest_horse_railway',
          name: 'Signature Budapest: Private Concert at Horse Railway Cultural Center',
          type: 'private_concert',
          venue: 'Horse Railway Cultural Center',
          description:
            "Private performance with champagne and hors d'oeuvres at reconstructed Zugliget Horse Railway terminal.",
        },
        {
          id: 'signature_budapest_wenckheim_palace',
          name: 'Signature Budapest: Private Concert at Wenckheim Palace',
          type: 'private_concert',
          venue: 'Wenckheim Palace',
          description:
            "Private concert at Neo-Baroque Wenckheim Palace in Budapest's Palace Quarter.",
        },
      ],
    },
    {
      id: 'bratislava',
      name: 'Bratislava',
      country: 'Slovakia',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 3 & 8',
      lon: 17.1077,
      lat: 48.1486,
    },
    {
      id: 'tulln',
      name: 'Tulln',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Days 4 & 9',
      lon: 16.05,
      lat: 48.33,
    },
    {
      id: 'wachau_valley',
      name: 'Wachau Valley',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
      days: 'Days 4 & 9',
      lon: 15.33,
      lat: 48.35,
    },
    {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
      days: 'Days 5, 10 & 11',
      lon: 16.3738,
      lat: 48.2082,
      day_details: [
        {
          day: 'Day 05',
          description:
            'Vienna, once an imperial capital, boasts grand Baroque architecture and historic charm.',
        },
        {
          day: 'Day 10',
          description: 'A day among palaces, cathedrals, museums and romantic coffee houses.',
        },
      ],
      experiences: [
        {
          id: 'signature_vienna_belvedere_palace',
          name: 'Signature Vienna: VIP Evening at Belvedere Palace',
          type: 'private_concert_and_museum_visit',
          venue: 'Belvedere Palace',
          description:
            'After-hours or VIP-style experience at Belvedere Palace with palace visit, art viewing and private Mozart/Strauss concert.',
        },
      ],
    },
    {
      id: 'durnstein',
      name: 'Dürnstein',
      country: 'Austria',
      image:
        'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
      days: 'Day 12',
      lon: 15.52,
      lat: 48.395,
    },
  ],
};
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `pnpm build`
Expected: Build succeeds.

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "chore: use full Danube Legends payload with experiences in dev mock"
```

---

### Task 5: Rip out the add-ons machinery

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/map/cities.ts`
- Modify: `components/panels/map/city-card.tsx`
- Modify: `lib/dev/mocks.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`
- Test: `lib/analytics/view-detail.test.ts`

This is a single coordinated removal: every add-ons reference goes away together so the build and tests stay green at the end.

- [ ] **Step 1: Remove add-ons from the view types**

In `lib/agent-ui/ui-view-types.ts`, delete the `AddOnDecision` type and the `addOnDecisions` field. Change:

```ts
export type AddOnDecision = 'confirmed' | 'rejected';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      addOnDecisions: Record<string, AddOnDecision>;
      detailCityId?: string;
    }
  | { type: 'compare_itinerary'; options: ItineraryFull[] }
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string };
```

to:

```ts
export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      detailCityId?: string;
    }
  | { type: 'compare_itinerary'; options: ItineraryFull[] }
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string };
```

- [ ] **Step 2: Remove add-ons from the store**

In `lib/agent-ui/ui-view-store.ts`:

Change the import (line 4) from:

```ts
import type { AddOnDecision, BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';
```

to:

```ts
import type { BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';
```

Remove the `setAddOnDecision` line from the `UiViewState` interface:

```ts
  setAddOnDecision: (addOnId: string, decision: AddOnDecision) => void;
```

In the `show_itinerary_options` case, change:

```ts
              view: { type: 'itinerary', itinerary: cmd.payload.itinerary, addOnDecisions: {} },
```

to:

```ts
              view: { type: 'itinerary', itinerary: cmd.payload.itinerary },
```

Delete the entire `setAddOnDecision` implementation (the block starting `setAddOnDecision: (addOnId, decision) =>` through its closing `}),`):

```ts
    setAddOnDecision: (addOnId, decision) =>
      set((state) => {
        if (state.view.type !== 'itinerary') return {};
        return {
          view: {
            ...state.view,
            addOnDecisions: { ...state.view.addOnDecisions, [addOnId]: decision },
          },
          source: 'user',
        };
      }),
```

- [ ] **Step 3: Remove the `AddOn` type and mock add-ons data**

In `lib/map/cities.ts`:

Delete the `AddOn` type (lines 1–5):

```ts
export type AddOn = {
  id: string;
  day: string;
  title: string;
};
```

Remove the `addOns?: AddOn[];` field from the `City` type (leave `experiences?: Experience[];`).

Remove the `addOns` arrays from the two cities that have them in the `cities` array. For Vienna, change:

```ts
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
```

to:

```ts
  {
    id: 'vienna',
    name: 'Vienna',
    country: 'Austria',
    image: '/map/viena.png',
    days: 'Days 1, 2 & 8',
    lon: 16.3738,
    lat: 48.2082,
  },
```

For Bratislava, change:

```ts
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
```

to:

```ts
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovakia',
    image: '/map/bratislava.png',
    days: 'Days 3 & 4',
    lon: 17.1077,
    lat: 48.1486,
  },
```

- [ ] **Step 4: Remove the add-ons UI from the card**

In `components/panels/map/city-card.tsx`:

Remove the now-unused imports. Delete:

```ts
import { useUiViewStore } from '@/lib/agent-ui/ui-view-store';
import type { AddOnDecision } from '@/lib/agent-ui/ui-view-types';
```

Change the cities import from:

```ts
import type { AddOn, City } from '@/lib/map/cities';
```

to:

```ts
import type { City } from '@/lib/map/cities';
```

Delete the add-ons rendering block from the `CityCard` body:

```tsx
      {city.addOns && city.addOns.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {city.addOns.map((addOn) => (
            <AddOnBlock key={addOn.id} addOn={addOn} interactive={interactive} />
          ))}
        </div>
      )}
```

Delete the three helper components and their prop types at the bottom of the file: `AddOnBlockProps`, `AddOnBlock`, `AddOnActionsProps`, and `AddOnActions` (everything from `type AddOnBlockProps = {` to the end of the file). After this, the file ends with the closing of the `CityCard` function.

- [ ] **Step 5: Remove `addOnDecisions` from the dev mocks**

In `lib/dev/mocks.ts`, in the `itinerary` mock array, change:

```ts
  itinerary: [
    {
      id: 'danube_legends',
      label: 'Danube Legends (agent payload)',
      view: { type: 'itinerary', addOnDecisions: {}, itinerary: danubeLegends },
    },
    {
      id: 'danube_legends_detail',
      label: 'Detail open (Vienna)',
      view: {
        type: 'itinerary',
        addOnDecisions: {},
        itinerary: danubeLegends,
        detailCityId: 'vienna',
      },
    },
  ],
```

to:

```ts
  itinerary: [
    {
      id: 'danube_legends',
      label: 'Danube Legends (agent payload)',
      view: { type: 'itinerary', itinerary: danubeLegends },
    },
    {
      id: 'danube_legends_detail',
      label: 'Detail open (Vienna)',
      view: {
        type: 'itinerary',
        itinerary: danubeLegends,
        detailCityId: 'vienna',
      },
    },
  ],
```

- [ ] **Step 6: Clean the store tests**

In `lib/agent-ui/ui-view-store.test.ts`:

In `applyCommand(show_itinerary_options) maps the itinerary into the itinerary view`, change:

```ts
    expect(s.view).toEqual({ type: 'itinerary', itinerary, addOnDecisions: {} });
```

to:

```ts
    expect(s.view).toEqual({ type: 'itinerary', itinerary });
```

Delete the whole test `it('setAddOnDecision preserves the itinerary on the view', () => { ... });`.

In `setViewFromDev does not clear bookingSummary`, change:

```ts
      store.getState().setViewFromDev({ type: 'itinerary', addOnDecisions: {} });
```

to:

```ts
      store.getState().setViewFromDev({ type: 'itinerary' });
```

In `applyCommand(show_city_detail) sets detailCityId on the itinerary view`, delete the line:

```ts
    expect(s.view.addOnDecisions).toEqual({});
```

Delete the whole test `it('setAddOnDecision preserves detailCityId', () => { ... });`.

Delete the entire `describe('add-on decisions', () => { ... });` block (the four `setAddOnDecision` tests).

- [ ] **Step 7: Clean the analytics test**

In `lib/analytics/view-detail.test.ts`, change:

```ts
    const view: UiView = { type: 'itinerary', addOnDecisions: {}, detailCityId: 'vienna' };
```

to:

```ts
    const view: UiView = { type: 'itinerary', detailCityId: 'vienna' };
```

and change:

```ts
    const view: UiView = { type: 'itinerary', addOnDecisions: {} };
```

to:

```ts
    const view: UiView = { type: 'itinerary' };
```

- [ ] **Step 8: Verify no add-ons references remain**

Run: `grep -rn "addOn\|AddOn\|MOCK_ADD_ON\|excursions" --include="*.ts" --include="*.tsx" lib components`
Expected: No output.

- [ ] **Step 9: Run the full test suite and build**

Run: `pnpm test`
Expected: PASS (no failures; the removed tests are gone, the rest are green).

Run: `pnpm build`
Expected: Build succeeds (the exhaustive `never` check in the reducer still holds; no TS errors).

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.ts lib/map/cities.ts components/panels/map/city-card.tsx lib/dev/mocks.ts lib/agent-ui/ui-view-store.test.ts lib/analytics/view-detail.test.ts
git commit -m "refactor: remove unused add-ons machinery"
```

---

## Final verification

- [ ] Run `pnpm lint` → clean.
- [ ] Run `pnpm test` → all green.
- [ ] Run `pnpm build` → succeeds.
- [ ] In the dev panel, load `itinerary → Danube Legends (agent payload)`: Budapest shows "3 experiences available", Vienna "1 experiences available", and Bratislava/Tulln/Wachau Valley/Dürnstein show no badge.
- [ ] In the dev panel, load `itinerary → Detail open (Vienna)`: the detail card shows the day-by-day section first, then an "Experiences" section listing the Belvedere Palace experience with its venue and description.
