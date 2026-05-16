# CompareItinerary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a content panel that shows two independent map instances side by side, each rendering a different itinerary, divided by a central visual separator with the Riverside logo.

**Architecture:** Parametrize `MapCanvas` so it receives its dataset (`cities`, `center`, `zoom`) via props, keeping current values as defaults for backward compatibility with `PanelMap`. Add two hardcoded itineraries. Compose a new `CompareItinerary` panel as a flex row of two halves, each rendering a `MapCanvas`, with an absolutely positioned central divider. Register it in the content-panel registry.

**Tech Stack:** Next.js (App Router), React, TypeScript, maplibre-gl, Tailwind CSS.

**Note on testing:** The project has no component test setup. Verification for each task uses TypeScript type-checking (`npx tsc --noEmit`), ESLint (`pnpm lint`), and a production build (`pnpm build`). No unit tests are added.

---

### Task 1: Itinerary data

**Files:**
- Create: `lib/map/itineraries.ts`

- [ ] **Step 1: Create the itinerary data file**

Create `lib/map/itineraries.ts` with the `Itinerary` type and two hardcoded itineraries. Cities reuse the existing entries from `cities.ts` (same `City` shape, same images in `public/map`).

```ts
import type { City } from '@/lib/map/cities';

export type Itinerary = {
  id: string;
  label: string;
  cities: City[];
  center: [number, number]; // [lon, lat]
  zoom: number;
};

const vienna: City = {
  id: 'vienna',
  name: 'Vienna',
  country: 'Austria',
  image: '/map/viena.png',
  days: 'Days 1, 2 & 8',
  lon: 16.3738,
  lat: 48.2082,
};

const bratislava: City = {
  id: 'bratislava',
  name: 'Bratislava',
  country: 'Slovakia',
  image: '/map/bratislava.png',
  days: 'Days 3 & 4',
  lon: 17.1077,
  lat: 48.1486,
};

const wachauValley: City = {
  id: 'wachau-valley',
  name: 'Wachau Valley',
  country: 'Austria',
  image: '/map/wachau-valley.png',
  days: 'Days 5, 6 & 7',
  lon: 15.4214,
  lat: 48.3797,
};

export const itineraries: Itinerary[] = [
  {
    id: 'danube-serenade',
    label: 'Danube Serenade',
    cities: [vienna, bratislava, wachauValley],
    center: [16.3, 48.25],
    zoom: 7.2,
  },
  {
    id: 'el-gran-danubio',
    label: 'El Gran Danubio',
    cities: [wachauValley, vienna],
    center: [15.9, 48.3],
    zoom: 7.4,
  },
];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/map/itineraries.ts
git commit -m "feat(compare-itinerary): add itinerary datasets"
```

---

### Task 2: Parametrize MapCanvas

**Files:**
- Modify: `components/app/content-panels/map-canvas.tsx`

- [ ] **Step 1: Update props and use them in the map**

Replace the `MapCanvasProps` type and the `MapCanvas` function so the dataset, center, and zoom come from props with the current values as defaults. The existing `cities` import is reused as the default. Keep the `cities` import line.

Replace lines 16–54 (the `MapCanvasProps` type through the end of the `useEffect`) with:

```tsx
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

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center,
      zoom,
      attributionControl: { compact: true },
    });

    const markers: maplibregl.Marker[] = [];
    const roots: Root[] = [];

    for (const city of cityList) {
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(<CityCard city={city} onExpand={onCityExpand} />);
      roots.push(root);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lon, city.lat])
        .addTo(map);
      markers.push(marker);
    }

    return () => {
      roots.forEach((root) => root.unmount());
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [cityList, center, zoom, onCityExpand]);
```

Note: the `center` prop is typed `[number, number]`; passing it directly to maplibre satisfies its `LngLatLike` parameter.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS. No unused-variable warnings for the `cities` import (it is used as the default).

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/map-canvas.tsx
git commit -m "refactor(map-canvas): accept cities, center and zoom via props"
```

---

### Task 3: CompareItinerary panel

**Files:**
- Create: `components/app/content-panels/compare-itinerary.tsx`

- [ ] **Step 1: Create the panel component**

The panel renders two `MapCanvas` instances (one per itinerary) in a flex row, each in its own half. `MapCanvas` is loaded with `next/dynamic` and `ssr: false` because maplibre needs the browser — mirror the pattern in `panel-map.tsx`. A central divider is absolutely positioned over the seam, with the Riverside logo in a beige card at its top.

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function CompareItinerary() {
  const handleCityExpand = useCallback((city: City) => {
    // TODO: wire up expand behavior (e.g. open detail panel for `city`).
    console.log('expand city', city.id);
  }, []);

  const [left, right] = itineraries;

  return (
    <div className="fixed inset-0 flex">
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={left.cities}
          center={left.center}
          zoom={left.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={right.cities}
          center={right.center}
          zoom={right.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>

      {/* Central divider */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <div className="bg-border h-full w-px" />
        <div className="bg-beige-200 absolute top-0 rounded-b-lg px-3 py-2 shadow-sm">
          <Image
            src="/riverside-logo.svg"
            alt="Riverside Luxury Cruises"
            width={100}
            height={110}
            priority
            className="h-[90px] w-auto"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/compare-itinerary.tsx
git commit -m "feat(compare-itinerary): add CompareItinerary panel"
```

---

### Task 4: Register the panel

**Files:**
- Modify: `components/app/content-panels/registry.ts`

- [ ] **Step 1: Add the import and registry entry**

Add the import after the existing `PanelC` import (line 3):

```ts
import { CompareItinerary } from '@/components/app/content-panels/compare-itinerary';
```

Add the entry to the end of the `CONTENT_PANELS` array (after the `panel-c` entry):

```ts
  { id: 'compare', label: 'Comparar itinerarios', component: CompareItinerary },
```

- [ ] **Step 2: Type-check, lint and build**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: PASS. The build succeeds and the new panel compiles.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/registry.ts
git commit -m "feat(compare-itinerary): register CompareItinerary in content panels"
```

---

## Verification (full feature)

After all tasks:

- [ ] `npx tsc --noEmit && pnpm lint && pnpm build` all pass.
- [ ] In `pnpm dev`, the content selector shows "Comparar itinerarios"; selecting it
      renders two maps side by side with the central divider and logo. Each map
      pans/zooms independently. (Browser check only if the user requests it.)
