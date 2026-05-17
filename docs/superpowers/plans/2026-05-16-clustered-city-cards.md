# Clustered City Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the city cards as a single React overlay so that geographically close cities collapse into a clean diagonal cascade instead of overlapping arbitrarily.

**Architecture:** Replace MapLibre's per-city HTML markers with one absolutely-positioned overlay rendered as a React child of `MapCanvas`. A new `CityCardLayer` subscribes to the map's `move` event, projects each city to screen pixels, groups nearby cities with the pure `clusterCities` helper, and renders each cluster as a stacked cascade (fixed diagonal offset + increasing `z-index`, only the front card interactive).

**Tech Stack:** Next.js 15, React 19, TypeScript, MapLibre GL, Tailwind v4. Vitest is added for unit-testing the pure clustering helper (no test runner exists yet).

---

## File Structure

- `vitest.config.ts` — new — Vitest config (node environment).
- `package.json` — modified — add `vitest` devDependency + `test` script.
- `lib/map/cluster-cities.ts` — new — pure `clusterCities` helper + `ProjectedCity` type.
- `lib/map/cluster-cities.test.ts` — new — unit tests for `clusterCities`.
- `components/app/content-panels/city-card.tsx` — modified — add `interactive` prop.
- `components/app/content-panels/city-card-layer.tsx` — new — the overlay component.
- `components/app/content-panels/map-canvas.tsx` — modified — drop per-city markers, render `CityCardLayer`.

---

### Task 1: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run: `pnpm add -D vitest`
Expected: `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Add the `test` script**

In `package.json`, inside `"scripts"`, add (after `"lint"`):

```json
"test": "vitest run",
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify the runner works**

Run: `pnpm test`
Expected: exits successfully reporting "No test files found" (no tests yet).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

### Task 2: `clusterCities` helper

**Files:**
- Create: `lib/map/cluster-cities.ts`
- Test: `lib/map/cluster-cities.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/map/cluster-cities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clusterCities, type ProjectedCity } from './cluster-cities';
import type { City } from './cities';

function makeCity(id: string): City {
  return {
    id,
    name: id,
    country: 'Test',
    image: '/test.png',
    days: 'Day 1',
    lon: 0,
    lat: 0,
  };
}

function pt(id: string, x: number, y: number): ProjectedCity {
  return { city: makeCity(id), x, y };
}

describe('clusterCities', () => {
  it('puts each city in its own group when none are close', () => {
    const result = clusterCities([pt('a', 0, 0), pt('b', 500, 500)], 120);
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.length === 1)).toBe(true);
  });

  it('groups two cities within the threshold', () => {
    const result = clusterCities([pt('a', 0, 0), pt('b', 50, 50)], 120);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });

  it('groups a transitive chain of three (A~B, B~C, A not near C)', () => {
    const result = clusterCities(
      [pt('a', 0, 0), pt('b', 100, 0), pt('c', 200, 0)],
      120
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it('keeps two separate pairs as two groups', () => {
    const result = clusterCities(
      [pt('a', 0, 0), pt('b', 40, 0), pt('c', 800, 0), pt('d', 840, 0)],
      120
    );
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.length === 2)).toBe(true);
  });

  it('returns an empty array for no input', () => {
    expect(clusterCities([], 120)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./cluster-cities`.

- [ ] **Step 3: Write the implementation**

Create `lib/map/cluster-cities.ts`:

```ts
import type { City } from './cities';

export type ProjectedCity = {
  city: City;
  x: number;
  y: number;
};

/**
 * Groups projected cities by screen proximity. Two cities belong to the same
 * group when their screen distance is within `threshold`; grouping is
 * transitive (A~B and B~C puts all three together).
 */
export function clusterCities(
  points: ProjectedCity[],
  threshold: number
): ProjectedCity[][] {
  const clusters: ProjectedCity[][] = [];
  const visited = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;

    const cluster: ProjectedCity[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.shift() as number;
      cluster.push(points[idx]);

      for (let j = 0; j < points.length; j++) {
        if (visited.has(j)) continue;
        const dx = points[idx].x - points[j].x;
        const dy = points[idx].y - points[j].y;
        if (Math.hypot(dx, dy) <= threshold) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/map/cluster-cities.ts lib/map/cluster-cities.test.ts
git commit -m "feat: add clusterCities screen-proximity grouping helper"
```

---

### Task 3: `interactive` prop on `CityCard`

**Files:**
- Modify: `components/app/content-panels/city-card.tsx`

- [ ] **Step 1: Add the prop and gate the expand button**

Replace the full contents of `components/app/content-panels/city-card.tsx` with:

```tsx
import Image from 'next/image';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { City } from '@/lib/map/cities';

type CityCardProps = {
  city: City;
  interactive?: boolean;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, interactive = true, onExpand }: CityCardProps) {
  return (
    <Card className="bg-beige-50 w-[220px] gap-0 overflow-hidden p-2.5">
      <div className="relative">
        <Image
          src={city.image}
          alt={city.name}
          width={200}
          height={130}
          className="h-[130px] w-full rounded-lg object-cover"
        />
        <span className="bg-background/90 absolute top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap shadow-sm">
          {city.days}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-lg leading-tight font-semibold">{city.name}</p>
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
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no new errors for `city-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/city-card.tsx
git commit -m "feat: add interactive prop to CityCard"
```

---

### Task 4: `CityCardLayer` overlay component

**Files:**
- Create: `components/app/content-panels/city-card-layer.tsx`

- [ ] **Step 1: Create the component**

Create `components/app/content-panels/city-card-layer.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { CityCard } from '@/components/app/content-panels/city-card';
import type { City } from '@/lib/map/cities';
import { type ProjectedCity, clusterCities } from '@/lib/map/cluster-cities';

// Cards are 220px wide; group when anchor screen distance is within this.
const CLUSTER_THRESHOLD = 120;
// Fixed diagonal offset between stacked cards in a cascade.
const OFFSET_X = 30;
const OFFSET_Y = 58;

type CityCardLayerProps = {
  map: maplibregl.Map;
  cities: City[];
  onCityExpand?: (city: City) => void;
};

export function CityCardLayer({ map, cities, onCityExpand }: CityCardLayerProps) {
  // Re-render on every map move so projected positions stay in sync.
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onMove = () => forceUpdate((n) => n + 1);
    map.on('move', onMove);
    return () => {
      map.off('move', onMove);
    };
  }, [map]);

  const projected: ProjectedCity[] = cities.map((city) => {
    const p = map.project([city.lon, city.lat]);
    return { city, x: p.x, y: p.y };
  });
  const clusters = clusterCities(projected, CLUSTER_THRESHOLD);

  return (
    <>
      {clusters.map((cluster) => {
        // North-to-south: southernmost card ends up at the front (on top).
        const sorted = [...cluster].sort((a, b) => b.city.lat - a.city.lat);
        const front = sorted[sorted.length - 1];

        return sorted.map((pc, i) => {
          const fromBack = sorted.length - 1 - i; // 0 = front card
          const left = front.x - fromBack * OFFSET_X;
          const top = front.y - fromBack * OFFSET_Y;
          const isFront = i === sorted.length - 1;

          return (
            <div
              key={pc.city.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isFront ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{ left, top, zIndex: i }}
            >
              <CityCard
                city={pc.city}
                interactive={isFront}
                onExpand={onCityExpand}
              />
            </div>
          );
        });
      })}
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no errors for `city-card-layer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/city-card-layer.tsx
git commit -m "feat: add CityCardLayer overlay with cascade clustering"
```

---

### Task 5: Wire `MapCanvas` to the overlay

**Files:**
- Modify: `components/app/content-panels/map-canvas.tsx`

- [ ] **Step 1: Replace per-city markers with the overlay**

Replace the full contents of `components/app/content-panels/map-canvas.tsx` with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CityCardLayer } from '@/components/app/content-panels/city-card-layer';
import { type City, cities } from '@/lib/map/cities';
import { parchmentStyle } from '@/lib/map/parchment-style';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

type MapCanvasProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
  onCityExpand?: (city: City) => void;
};

export function MapCanvas({
  cities: cityList = cities,
  center = [17.5, 48.0],
  zoom = 6.8,
  onCityExpand,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center,
      zoom,
      attributionControl: { compact: true },
    });

    mapInstance.on('load', () => setMap(mapInstance));

    return () => {
      setMap(null);
      mapInstance.remove();
    };
  }, [center, zoom]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_IMAGE, backgroundRepeat: 'repeat' }}
      />
      {map && (
        <div className="pointer-events-none absolute inset-0">
          <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `pnpm lint`
Expected: no errors. The `react-dom/client` and `CityCard` imports are gone from this file (now used only by `CityCardLayer`).

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS — 5 tests still pass.

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`, open the compare-itinerary view. Confirm: cities far apart show normal standalone cards; zooming out until cities collide collapses them into a diagonal cascade with only the front (southernmost) card showing the expand button; zooming back in separates them again.

- [ ] **Step 5: Commit**

```bash
git add components/app/content-panels/map-canvas.tsx
git commit -m "feat: render city cards via clustered overlay layer"
```

---

## Notes

- `CLUSTER_THRESHOLD`, `OFFSET_X`, `OFFSET_Y` in `city-card-layer.tsx` are tuning
  knobs — adjust visually during manual verification (Task 5, Step 4).
- The overlay container is `pointer-events-none`; only the front card's wrapper
  re-enables pointer events, matching the "solo la de adelante es interactiva"
  decision.
