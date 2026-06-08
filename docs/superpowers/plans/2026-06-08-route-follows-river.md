# Route Follows the Danube Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the itinerary route line trace the Danube's real course between the cities instead of drawing straight segments between them.

**Architecture:** Add a static, pre-extracted Danube polyline (`lib/map/danube-path.ts`). Rewrite `routeFeatureCollection` in `lib/map/route-path.ts` to clip that polyline to the itinerary's longitude extent and anchor the ends to the westernmost/easternmost cities, returning the same `RouteFeatureCollection` type. `route-layer.tsx` is untouched — only the shape of the coordinates changes.

**Tech Stack:** TypeScript, Vitest, MapLibre GL (consumer only — no MapLibre changes).

---

### Task 1: Add the static Danube polyline

The coordinates below were extracted once from OpenStreetMap (waterway=river, name:en=Danube) via the Overpass API, stitched into a single west-to-east line, clipped to the Wachau→Bratislava reach, and simplified with Douglas–Peucker (tolerance 0.0025°) to 39 points. They are committed as static data so there are no runtime network calls.

**Files:**
- Create: `lib/map/danube-path.ts`

- [ ] **Step 1: Create the data module**

```typescript
// lib/map/danube-path.ts

// The Danube's course over the itinerary reach (Wachau Valley → Vienna →
// Bratislava), ordered west-to-east as [lon, lat] pairs.
//
// Source: OpenStreetMap, ODbL. Extracted once via the Overpass API and embedded
// as static data — no runtime fetch. To regenerate, query the Danube river ways
// over the reach, stitch them into one west-to-east line, and simplify:
//
//   [out:json][timeout:120];
//   way["waterway"="river"]["name:en"="Danube"](48.05,15.30,48.45,17.20);
//   out geom;
//
// then stitch by shared endpoints, clip to lon 15.50–17.12, and run
// Douglas–Peucker at tolerance 0.0025°.
export const DANUBE_COORDINATES: [number, number][] = [
  [15.5594, 48.39135],
  [15.58707, 48.40099],
  [15.6271, 48.40338],
  [15.64779, 48.39784],
  [15.66888, 48.38144],
  [15.71099, 48.38826],
  [15.74363, 48.37196],
  [15.76408, 48.37308],
  [15.792, 48.38139],
  [15.85048, 48.3797],
  [15.87413, 48.37052],
  [15.89247, 48.3535],
  [15.94206, 48.33993],
  [15.99991, 48.34234],
  [16.02677, 48.33487],
  [16.1024, 48.33392],
  [16.16528, 48.3396],
  [16.21706, 48.35039],
  [16.28327, 48.35215],
  [16.32733, 48.33317],
  [16.34627, 48.29268],
  [16.38055, 48.25089],
  [16.41291, 48.22288],
  [16.48128, 48.17429],
  [16.54394, 48.143],
  [16.584, 48.13375],
  [16.65321, 48.12768],
  [16.68938, 48.11823],
  [16.73685, 48.12853],
  [16.79697, 48.11613],
  [16.86917, 48.12884],
  [16.908, 48.14642],
  [16.93606, 48.1495],
  [16.94331, 48.15254],
  [16.95863, 48.17026],
  [16.97032, 48.17333],
  [17.03268, 48.14019],
  [17.06657, 48.14356],
  [17.11915, 48.13822],
];
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm tsc --noEmit`
Expected: no errors referencing `danube-path.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/map/danube-path.ts
git commit -m "feat(map): add static Danube polyline data"
```

---

### Task 2: Rewrite route-path to follow the river

`routeFeatureCollection` stops connecting city vertices. It now clips
`DANUBE_COORDINATES` to the itinerary's longitude span and anchors the visible
ends to the westernmost and easternmost cities, so the line reaches each city
while bending along the river in between. The return type is unchanged, so
`route-layer.tsx` needs no edit.

**Files:**
- Modify: `lib/map/route-path.ts`
- Test: `lib/map/route-path.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/map/route-path.test.ts
import { describe, expect, it } from 'vitest';
import { routeFeatureCollection } from './route-path';
import { DANUBE_COORDINATES } from './danube-path';
import type { City } from './cities';

const city = (id: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'Austria',
  image: '',
  days: '',
  lon,
  lat,
});

// The three itinerary cities, intentionally out of west-to-east order.
const wachau = city('wachau', 15.4214, 48.3797);
const vienna = city('vienna', 16.3738, 48.2082);
const bratislava = city('bratislava', 17.1077, 48.1486);

describe('routeFeatureCollection', () => {
  it('returns an empty collection for fewer than two cities', () => {
    expect(routeFeatureCollection([vienna]).features).toHaveLength(0);
    expect(routeFeatureCollection([]).features).toHaveLength(0);
  });

  it('traces the river: many points, not one vertex per city', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    expect(fc.features).toHaveLength(1);
    const coords = fc.features[0].geometry.coordinates;
    // Far more than the 3 city vertices a straight route would produce.
    expect(coords.length).toBeGreaterThan(10);
  });

  it('anchors the ends to the westernmost and easternmost cities', () => {
    const fc = routeFeatureCollection([vienna, bratislava, wachau]);
    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toEqual([wachau.lon, wachau.lat]);
    expect(coords[coords.length - 1]).toEqual([bratislava.lon, bratislava.lat]);
  });

  it('keeps every coordinate within the cities longitude span', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    const coords = fc.features[0].geometry.coordinates;
    for (const [lon] of coords) {
      expect(lon).toBeGreaterThanOrEqual(wachau.lon);
      expect(lon).toBeLessThanOrEqual(bratislava.lon);
    }
  });

  it('only includes river points between the city longitudes', () => {
    const fc = routeFeatureCollection([wachau, vienna, bratislava]);
    const coords = fc.features[0].geometry.coordinates;
    const interior = coords.slice(1, -1);
    // Every interior point is an actual Danube vertex within the span.
    for (const p of interior) {
      expect(DANUBE_COORDINATES.some(([lo, la]) => lo === p[0] && la === p[1])).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test route-path`
Expected: FAIL — current implementation sorts city vertices, so `coords.length` is 3 and the anchor/interior assertions fail.

- [ ] **Step 3: Rewrite the implementation**

Replace the body of `lib/map/route-path.ts` with:

```typescript
import type { City } from '@/lib/map/cities';
import { DANUBE_COORDINATES } from '@/lib/map/danube-path';

// The voyage drawn as a single line that follows the Danube's course between the
// itinerary cities. Structurally a GeoJSON FeatureCollection with one LineString,
// kept as a local type so this module needs no extra dependency; it is assignable
// to the GeoJSON.FeatureCollection MapLibre's addSource/setData take.
export type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties: Record<string, never>;
  }[];
};

// One LineString tracing the Danube between the westernmost and easternmost
// cities. The river points within the cities' longitude span form the body; the
// span's end cities anchor the visible line so it reaches each marker. Fewer than
// two cities can't form a line, so the collection comes back empty.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  if (cities.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const west = cities.reduce((a, b) => (b.lon < a.lon ? b : a));
  const east = cities.reduce((a, b) => (b.lon > a.lon ? b : a));

  const body = DANUBE_COORDINATES.filter(([lon]) => lon > west.lon && lon < east.lon);
  const coordinates: [number, number][] = [
    [west.lon, west.lat],
    ...body,
    [east.lon, east.lat],
  ];

  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test route-path`
Expected: PASS — all five tests green.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/map/route-path.ts lib/map/route-path.test.ts
git commit -m "feat(map): trace the route along the Danube"
```

---

### Task 3: Verify the full suite

**Files:** none

- [ ] **Step 1: Run the whole suite and lint**

Run: `pnpm test && pnpm lint`
Expected: all tests pass, lint clean.

- [ ] **Step 2 (optional, only if requested): visual check**

Per project memory, skip browser/visual verification unless the user explicitly
asks. If asked: run the app, open the itinerary map, and confirm the route bends
along the Danube through Vienna rather than cutting straight across.

---

## Notes for the implementer

- **Do not edit `components/panels/map/route-layer.tsx`.** The return type of
  `routeFeatureCollection` is unchanged; the layer keeps working as-is.
- The west/east anchors are city coordinates, so the line's endpoints sit exactly
  on the city markers; the interior follows real river vertices.
- The river data is the full Wachau→Bratislava reach. With the current 3-city
  itinerary the whole polyline shows. A narrower city span would clip it to that
  sub-stretch automatically via the `filter`.
