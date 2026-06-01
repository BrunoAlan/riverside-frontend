# Itinerary City Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a focused city-detail state to the itinerary view — map centered on one city, other cards hidden, a large detail card overlaid — openable by the user (expand button) and the agent (`show_city_detail` command), with the user action reported to the backend via a `FrontendIntent`.

**Architecture:** The detail is a `detailCityId` flag on the existing `itinerary` view (not a new view), so the MapLibre map is never torn down. A new outbound `FrontendIntent` transport publishes UI events to the backend over the LiveKit data channel. The detail card reads a new optional `day_details` field on the itinerary city payload.

**Tech Stack:** Next.js (App Router), TypeScript (strict), Zod, Zustand, MapLibre GL, LiveKit, Tailwind, shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-itinerary-city-detail-design.md`

**Conventions:** Package manager is `pnpm`. Tests are co-located. `pnpm test` runs `vitest run`; `pnpm lint` runs `eslint .`. Payload (wire) fields are snake_case; internal types are camelCase.

---

## File Structure

**Create:**
- `lib/agent-ui/frontend-intent.ts` — `FrontendIntent` v1 envelope builder + publisher (outbound transport).
- `lib/agent-ui/frontend-intent.test.ts` — tests for the builder.
- `hooks/use-frontend-intent.ts` — `useFrontendIntent()` React hook.
- `components/panels/map/city-detail-card.tsx` — the large overlay detail card.

**Modify:**
- `lib/agent-ui/commands.ts` — export `ItineraryCity`, add `day_details`, add `show_city_detail`.
- `lib/agent-ui/commands.test.ts` — schema tests.
- `lib/agent-ui/ui-view-types.ts` — add `detailCityId` to the `itinerary` view.
- `lib/agent-ui/ui-view-store.ts` — handle `show_city_detail`; preserve `detailCityId` in `setAddOnDecision`.
- `lib/agent-ui/ui-view-store.test.ts` — reducer tests.
- `components/panels/map/map-canvas.tsx` — add `focusCity` prop (camera + hide cards).
- `components/panels/map/panel-map.tsx` — take the `itinerary` view, resolve detail, wire expand/close + intents, overlay the card.
- `components/agent-ui/views/itinerary-view.tsx` — pass `view` to `PanelMap`.
- `lib/dev/mocks.ts` — add `day_details` to the seed cities + a detail-open mock.

---

## Task 1: Add `day_details` to the itinerary city schema

**Files:**
- Modify: `lib/agent-ui/commands.ts` (the `ItineraryCity` const, ~lines 19-28)
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('UiCommand schema', ...)` block in `lib/agent-ui/commands.test.ts`:

```ts
it('parses show_itinerary_options with per-city day_details', () => {
  const result = UiCommand.parse({
    type: 'show_itinerary_options',
    correlationId: 'c-daydetails',
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
            day_details: [{ day: 'Day 01', description: 'Arrive in Vienna.' }],
          },
        ],
      },
    },
  });
  if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
  expect(result.payload.itinerary.cities[0].day_details).toEqual([
    { day: 'Day 01', description: 'Arrive in Vienna.' },
  ]);
});

it('rejects a malformed day_details entry', () => {
  const parsed = UiCommand.safeParse({
    type: 'show_itinerary_options',
    correlationId: 'c-bad',
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
            day_details: [{ day: 'Day 01' }],
          },
        ],
      },
    },
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: the first new test FAILS — `day_details` is stripped (undefined) so the `toEqual` assertion fails.

- [ ] **Step 3: Add the field and export the type**

In `lib/agent-ui/commands.ts`, replace the `ItineraryCity` declaration (keep the existing comment above it):

```ts
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
export type ItineraryCity = z.infer<typeof ItineraryCity>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: PASS (both new tests and all existing ones).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add optional day_details to itinerary city"
```

---

## Task 2: Add the `show_city_detail` command

**Files:**
- Modify: `lib/agent-ui/commands.ts` (after `SetCabinDetail`, and the `UiCommand` union)
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('UiCommand schema', ...)`:

```ts
it('parses show_city_detail with a string city_id', () => {
  const result = UiCommand.parse({
    type: 'show_city_detail',
    correlationId: 'c-detail',
    payload: { city_id: 'vienna' },
  });
  if (result.type !== 'show_city_detail') throw new Error('discriminator failed');
  expect(result.payload.city_id).toBe('vienna');
});

it('parses show_city_detail with a null city_id (close)', () => {
  const result = UiCommand.parse({
    type: 'show_city_detail',
    correlationId: 'c-close',
    payload: { city_id: null },
  });
  if (result.type !== 'show_city_detail') throw new Error('discriminator failed');
  expect(result.payload.city_id).toBeNull();
});

it('rejects show_city_detail without a city_id', () => {
  const parsed = UiCommand.safeParse({
    type: 'show_city_detail',
    correlationId: 'c-bad',
    payload: {},
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: FAIL — `show_city_detail` is not a known discriminator, so `UiCommand.parse` throws / `safeParse` fails on the valid cases.

- [ ] **Step 3: Define the command and add it to the union**

In `lib/agent-ui/commands.ts`, add after the `SetCabinDetail` declaration:

```ts
const ShowCityDetail = Base.extend({
  type: z.literal('show_city_detail'),
  payload: z.object({ city_id: z.string().nullable() }),
});
```

Then add `ShowCityDetail` to the `UiCommand` discriminated union array:

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDestinationDetail,
  SetBookingSummary,
  SetCabinDetail,
  ShowCityDetail,
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add show_city_detail command"
```

---

## Task 3: Add `detailCityId` to the itinerary view type

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts` (the `itinerary` union member)

- [ ] **Step 1: Edit the view type**

In `lib/agent-ui/ui-view-types.ts`, replace the `itinerary` member of the `UiView` union:

```ts
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      addOnDecisions: Record<string, AddOnDecision>;
      detailCityId?: string;
    }
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS. (Adding an optional field does not break the exhaustive reducer or any existing construction of the view.)

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts
git commit -m "feat(types): add detailCityId to itinerary view"
```

---

## Task 4: Handle `show_city_detail` in the reducer

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts` (`applyCommand` signature + new case; `setAddOnDecision`)
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/agent-ui/ui-view-store.test.ts`. First, a small helper to put the store on an itinerary view, then the cases. Add inside the top-level `describe('ui-view-store', ...)`:

```ts
const itineraryPayload = {
  id: 'danube_legends',
  name: 'Danube Legends',
  duration: { days: 12, nights: 11 },
  match_score: 0.6667,
  departure_dates: ['2026-04-22'],
  center: [16.57, 48.15] as [number, number],
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
    },
  ],
};

it('applyCommand(show_city_detail) sets detailCityId on the itinerary view', () => {
  store.getState().applyCommand({
    type: 'show_itinerary_options',
    correlationId: 'c1',
    payload: { itinerary: itineraryPayload },
  });
  store.getState().applyCommand({
    type: 'show_city_detail',
    correlationId: 'c2',
    payload: { city_id: 'vienna' },
  });
  const s = store.getState();
  if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
  expect(s.view.detailCityId).toBe('vienna');
  expect(s.view.itinerary?.id).toBe('danube_legends');
  expect(s.view.addOnDecisions).toEqual({});
  expect(s.source).toBe('agent');
  expect(s.lastCorrelationId).toBe('c2');
});

it('applyCommand(show_city_detail) with null clears detailCityId', () => {
  store.getState().applyCommand({
    type: 'show_itinerary_options',
    correlationId: 'c1',
    payload: { itinerary: itineraryPayload },
  });
  store.getState().applyCommand({
    type: 'show_city_detail',
    correlationId: 'c2',
    payload: { city_id: 'vienna' },
  });
  store.getState().applyCommand({
    type: 'show_city_detail',
    correlationId: 'c3',
    payload: { city_id: null },
  });
  const s = store.getState();
  if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
  expect(s.view.detailCityId).toBeUndefined();
});

it('applyCommand(show_city_detail) is a no-op on the view when not on itinerary', () => {
  store.getState().applyCommand({
    type: 'show_city_detail',
    correlationId: 'c1',
    payload: { city_id: 'vienna' },
  });
  const s = store.getState();
  expect(s.view).toEqual({ type: 'start' });
  expect(s.lastCorrelationId).toBe('c1');
});

it('setAddOnDecision preserves detailCityId', () => {
  store.getState().applyCommand({
    type: 'show_itinerary_options',
    correlationId: 'c1',
    payload: { itinerary: itineraryPayload },
  });
  store.getState().applyCommand({
    type: 'show_city_detail',
    correlationId: 'c2',
    payload: { city_id: 'vienna' },
  });
  store.getState().setAddOnDecision('vienna-addon', 'confirmed');
  const s = store.getState();
  if (s.view.type !== 'itinerary') throw new Error('expected itinerary view');
  expect(s.view.detailCityId).toBe('vienna');
  expect(s.view.addOnDecisions).toEqual({ 'vienna-addon': 'confirmed' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `show_city_detail` is unhandled (TypeScript also flags the `applyCommand` call site, and at runtime it hits the `default`/no-op returning `{}`), and `setAddOnDecision` currently drops `detailCityId`.

- [ ] **Step 3: Change `applyCommand` to read state and add the case**

In `lib/agent-ui/ui-view-store.ts`, change the reducer signature from:

```ts
    applyCommand: (cmd) =>
      set(() => {
        switch (cmd.type) {
```

to:

```ts
    applyCommand: (cmd) =>
      set((state) => {
        switch (cmd.type) {
```

Then add this case immediately before the `default:` case:

```ts
          case 'show_city_detail': {
            if (state.view.type !== 'itinerary') {
              return { source: 'agent', lastCorrelationId: cmd.correlationId };
            }
            return {
              view: { ...state.view, detailCityId: cmd.payload.city_id ?? undefined },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlationId,
            };
          }
```

- [ ] **Step 4: Preserve `detailCityId` in `setAddOnDecision`**

In the same file, in `setAddOnDecision`, replace the returned `view` object so it spreads the existing view instead of re-listing fields:

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

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run lib/agent-ui/ui-view-store.test.ts`
Expected: PASS (new + existing).

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(store): handle show_city_detail and preserve detailCityId"
```

---

## Task 5: FrontendIntent envelope builder + publisher

**Files:**
- Create: `lib/agent-ui/frontend-intent.ts`
- Test: `lib/agent-ui/frontend-intent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/agent-ui/frontend-intent.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FRONTEND_INTENT_TOPIC, buildFrontendIntent } from './frontend-intent';

describe('buildFrontendIntent', () => {
  it('builds a v1 envelope with intent only', () => {
    const env = buildFrontendIntent('view_itinerary');
    expect(env).toEqual({
      version: 'v1',
      topic: 'frontend-intent',
      intent: 'view_itinerary',
    });
    expect(FRONTEND_INTENT_TOPIC).toBe('frontend-intent');
  });

  it('includes entities and user_message when provided', () => {
    const env = buildFrontendIntent('explore_destination', {
      entities: { destination_id: 'vienna' },
      userMessage: 'User opened Vienna detail',
    });
    expect(env.entities).toEqual({ destination_id: 'vienna' });
    expect(env.user_message).toBe('User opened Vienna detail');
    expect(env.intent).toBe('explore_destination');
  });

  it('omits optional fields when not provided', () => {
    const env = buildFrontendIntent('view_itinerary', {});
    expect('entities' in env).toBe(false);
    expect('user_message' in env).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: FAIL — module `./frontend-intent` does not exist.

- [ ] **Step 3: Implement the builder + publisher**

Create `lib/agent-ui/frontend-intent.ts`:

```ts
import type { LocalParticipant } from 'livekit-client';

export const FRONTEND_INTENT_TOPIC = 'frontend-intent';

// Outbound UI event to the deterministic backend. Mirrors the FrontendIntent v1
// contract: the backend skips the LLM classifier and runs `intent` directly.
export type FrontendIntent = {
  version: 'v1';
  topic: typeof FRONTEND_INTENT_TOPIC;
  intent: string;
  entities?: Record<string, unknown>;
  user_message?: string;
  correlationId?: string;
};

type BuildOptions = {
  entities?: Record<string, unknown>;
  userMessage?: string;
  correlationId?: string;
};

export function buildFrontendIntent(intent: string, opts: BuildOptions = {}): FrontendIntent {
  return {
    version: 'v1',
    topic: FRONTEND_INTENT_TOPIC,
    intent,
    ...(opts.entities ? { entities: opts.entities } : {}),
    ...(opts.userMessage ? { user_message: opts.userMessage } : {}),
    ...(opts.correlationId ? { correlationId: opts.correlationId } : {}),
  };
}

export async function publishFrontendIntent(
  participant: LocalParticipant,
  envelope: FrontendIntent
): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  await participant.publishData(bytes, { topic: FRONTEND_INTENT_TOPIC, reliable: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/frontend-intent.ts lib/agent-ui/frontend-intent.test.ts
git commit -m "feat(agent-ui): add outbound FrontendIntent transport"
```

---

## Task 6: `useFrontendIntent` hook

**Files:**
- Create: `hooks/use-frontend-intent.ts`

No co-located test: the hook needs a LiveKit room context (same reason `useUiCommandTransport` / `useChatTranscription` have no hook tests — the pure logic in `frontend-intent.ts` is covered in Task 5).

- [ ] **Step 1: Implement the hook**

Create `hooks/use-frontend-intent.ts`:

```ts
'use client';

import { useCallback, useRef } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { buildFrontendIntent, publishFrontendIntent } from '@/lib/agent-ui/frontend-intent';

type SendIntentOptions = {
  entities?: Record<string, unknown>;
  userMessage?: string;
};

export function useFrontendIntent(): (intent: string, opts?: SendIntentOptions) => Promise<void> {
  const room = useMaybeRoomContext();
  const roomRef = useRef(room);
  roomRef.current = room;

  return useCallback(async (intent: string, opts: SendIntentOptions = {}) => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    await publishFrontendIntent(participant, buildFrontendIntent(intent, opts));
  }, []);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-frontend-intent.ts
git commit -m "feat(hooks): add useFrontendIntent"
```

---

## Task 7: `CityDetailCard` component

**Files:**
- Create: `components/panels/map/city-detail-card.tsx`

No co-located test (the existing map components have none; verify visually via the dev panel in Task 10).

- [ ] **Step 1: Implement the component**

Create `components/panels/map/city-detail-card.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ItineraryCity } from '@/lib/agent-ui/commands';

const CARD_WIDTH = 380;

type CityDetailCardProps = {
  city: ItineraryCity;
  onClose: () => void;
};

export function CityDetailCard({ city, onClose }: CityDetailCardProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <Card
        className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-3xl p-3 shadow-lg"
        style={{ width: CARD_WIDTH }}
      >
        <div className="relative shrink-0">
          <Image
            src={city.image}
            alt={city.name}
            width={CARD_WIDTH}
            height={200}
            className="h-[200px] w-full rounded-2xl object-cover"
          />
          <span className="bg-beige-200 text-primary absolute top-3 left-3 rounded-full px-3 py-1 text-sm whitespace-nowrap">
            {city.days}
          </span>
        </div>
        <div className="flex shrink-0 items-start justify-between gap-2 px-2 pt-4">
          <div>
            <p className="text-2xl leading-tight">{city.name}</p>
            <p className="text-muted-foreground text-base">{city.country}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={`Close ${city.name} detail`}
            onClick={onClose}
          >
            <XIcon weight="bold" />
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4 overflow-y-auto px-2 pb-2">
          {city.day_details?.map((detail, i) => (
            <div key={`${detail.day}-${i}`}>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">{detail.day}</p>
              <p className="text-primary mt-2 text-sm leading-relaxed">{detail.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS. (`XIcon` is already imported the same way in `components/panels/cabin/cabin-detail-modal.tsx`, so the import is known-good.)

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/city-detail-card.tsx
git commit -m "feat(map): add CityDetailCard overlay"
```

---

## Task 8: `MapCanvas` — `focusCity` prop

**Files:**
- Modify: `components/panels/map/map-canvas.tsx`

- [ ] **Step 1: Add the `DETAIL_ZOOM` constant**

In `components/panels/map/map-canvas.tsx`, add below the existing `FIT_MAX_ZOOM` constant:

```ts
// Zoom level the camera flies to when focusing a single city in detail mode.
const DETAIL_ZOOM = 8.5;
```

- [ ] **Step 2: Add the prop to the type and destructuring**

Update `MapCanvasProps`:

```ts
type MapCanvasProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
  focusCity?: City;
  onCityExpand?: (city: City) => void;
};
```

And add `focusCity` to the destructured params of `MapCanvas`:

```ts
export function MapCanvas({
  cities: cityList = cities,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  focusCity,
  onCityExpand,
}: MapCanvasProps) {
```

- [ ] **Step 3: Add the focus branch to the camera effect**

Replace the camera effect body so a set `focusCity` flies the camera and short-circuits the fit/jump logic:

```ts
  useEffect(() => {
    if (!map) return;
    if (focusCity) {
      map.flyTo({ center: [focusCity.lon, focusCity.lat], zoom: DETAIL_ZOOM, duration: 800 });
      return;
    }
    if (cityList.length >= 2) {
      const bounds = cityBounds(cityList);
      if (bounds) {
        map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate: false });
        return;
      }
    }
    map.jumpTo({ center, zoom });
  }, [map, cityList, center, zoom, focusCity]);
```

- [ ] **Step 4: Hide the card layer while focused**

Change the layer render line from:

```tsx
      {map && <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />}
```

to:

```tsx
      {map && !focusCity && (
        <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
      )}
```

- [ ] **Step 5: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/panels/map/map-canvas.tsx
git commit -m "feat(map): focusCity prop centers camera and hides cards"
```

---

## Task 9: Wire `PanelMap` + `ItineraryView`

**Files:**
- Modify: `components/panels/map/panel-map.tsx`
- Modify: `components/agent-ui/views/itinerary-view.tsx`

- [ ] **Step 1: Rewrite `PanelMap` to take the itinerary view and wire the detail**

Replace the entire contents of `components/panels/map/panel-map.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
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

  const { itinerary, addOnDecisions, detailCityId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary, addOnDecisions]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary, addOnDecisions });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary, addOnDecisions]);

  return (
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
      />
      {detailCity && <CityDetailCard city={detailCity} onClose={handleClose} />}
    </div>
  );
}
```

> Note: `itinerary.cities` are `ItineraryCity[]`. `detailCity` (an `ItineraryCity`) is passed to `MapCanvas`'s `focusCity` (typed `City`) — assignable, since `ItineraryCity` has every `City` field and the extra `day_details` is ignored there. `CityDetailCard` receives it as `ItineraryCity` so `day_details` is in scope.

- [ ] **Step 2: Update `ItineraryView` to pass the view**

Replace the body of `components/agent-ui/views/itinerary-view.tsx`:

```tsx
'use client';

import { PanelMap } from '@/components/panels/map/panel-map';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function ItineraryView({ view }: { view: Extract<UiView, { type: 'itinerary' }> }) {
  return <PanelMap view={view} />;
}
```

- [ ] **Step 3: Verify it type-checks and existing tests pass**

Run: `pnpm lint && pnpm test`
Expected: PASS. (`PanelMap` is only used by `ItineraryView`, confirmed by grep, so the prop-shape change has no other call sites.)

- [ ] **Step 4: Commit**

```bash
git add components/panels/map/panel-map.tsx components/agent-ui/views/itinerary-view.tsx
git commit -m "feat(map): wire city detail open/close with FrontendIntent"
```

---

## Task 10: Dev panel mock

**Files:**
- Modify: `lib/dev/mocks.ts` (the `itinerary` array, lines 52-97)

- [ ] **Step 1a: Add a module-level `danubeLegends` const**

`VIEW_MOCKS` is typed `Record<UiView['type'], ViewMock[]>`, so each value must be a `ViewMock[]`. To share the same itinerary object across two entries without duplicating it, declare a module-level const. Add it in `lib/dev/mocks.ts` directly above `export const VIEW_MOCKS = ...`, after the imports:

```ts
const danubeLegends = {
  id: 'danube_legends_from_budapest_to_vienna',
  name: 'Danube Legends from Budapest to Vienna',
  duration: { days: 12, nights: 11 },
  match_score: 0.6667,
  departure_dates: ['2026-04-22', '2026-05-06', '2026-05-20'],
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
        { day: 'Day 01', description: 'Arrive in Budapest and embark. Evening welcome dinner aboard.' },
        { day: 'Day 02', description: 'Guided tour of Buda Castle and the Fisherman’s Bastion.' },
      ],
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
        { day: 'Day 05', description: 'Vienna, once an imperial capital, boasts grand Baroque architecture and historic charm.' },
        { day: 'Day 10', description: 'A day among palaces, cathedrals, museums and romantic coffee houses.' },
      ],
    },
  ],
};
```

- [ ] **Step 1b: Replace the `itinerary` array entries**

Replace the `itinerary` array (lines 52-97) with three entries that reference `danubeLegends`:

```ts
  itinerary: [
    {
      id: 'default',
      label: 'Map (fallback cities)',
      view: { type: 'itinerary', addOnDecisions: {} },
    },
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

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual visual check (dev panel)**

Run: `pnpm dev`, open the app, click `dev` (bottom-right), select view `itinerary` → mock `Detail open (Vienna)` → **Apply**.
Expected: map centers on Vienna, the other city cards are hidden, and the large `CityDetailCard` shows Vienna / Austria with the Day 05 and Day 10 blocks. Clicking the `X` returns to the overview with all cards. Clicking a card's expand button opens that city's detail.

- [ ] **Step 4: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "feat(dev): add itinerary city-detail mock with day_details"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full lint + test suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS with no errors. Per AGENTS.MD, a clean `pnpm lint` and `pnpm test` are required before any push/merge.

- [ ] **Step 2: If anything fails, fix the root cause**

Do not disable rules, skip tests, or use `--no-verify`. Re-run until clean.

---

## Self-Review notes (for the implementer)

- **Spec coverage:** state model (Task 3/4), `show_city_detail` command (Task 2), `day_details` (Task 1), FrontendIntent transport + intents on open/close (Tasks 5/6/9), `CityDetailCard` (Task 7), `MapCanvas.focusCity` (Task 8), `PanelMap`/`ItineraryView` wiring (Task 9), dev mock (Task 10), tests (Tasks 1/2/4/5).
- **Assumption flagged in spec:** the close intent id `view_itinerary` and the entity keys (`destination_id`, `itinerary_name`) must be confirmed against the backend `Intent.md` catalog; an unknown intent degrades to a `soft_redirect` server-side.
- **Out of scope (do not add):** add-on block in the detail card, brand-logo overlay, camera offset so the city peeks beside the card, richer per-day content.
