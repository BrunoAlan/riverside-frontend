# Recorrido del barco en el itinerario — Implementation Plan

> **Superseded (2026-06-08):** este plan construía el recorrido como **arcos por
> día con revisitas**. Tras revisarlo, el feature se simplificó a **una línea
> recta que conecta las ciudades** (sin loops ni flechas). El diseño vigente está
> en `docs/superpowers/specs/2026-06-08-itinerary-route-path-design.md`; las tasks
> de abajo quedan como registro del enfoque original.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dibujar el viaje del barco sobre el mapa del itinerario como arcos curvos en orden de día, con flechas de dirección, mostrando las revisitas (cuando el barco vuelve a una ciudad).

**Architecture:** Un helper puro (`lib/map/route-path.ts`) reconstruye la secuencia ordenada de tramos desde el string `days` de cada ciudad y la convierte en GeoJSON de arcos Bézier. Un componente que espeja `CityCardLayer` (`route-layer.tsx`) pinta ese GeoJSON como una capa de línea + una capa de flechas sobre el mapa MapLibre existente. `map-canvas.tsx` lo monta junto a las tarjetas, con la misma condición que las oculta en modo detalle.

**Tech Stack:** TypeScript, React, MapLibre GL 5, Vitest. Sin dependencias nuevas (el arco es un Bézier propio; la flecha es un triángulo dibujado en canvas).

**Branch:** `feat/itinerary-route-path` (ya creada). Spec: `docs/superpowers/specs/2026-06-08-itinerary-route-path-design.md`.

---

## Task 1: `parseDayNumbers` — números de día crudos

Hoy `parseCityDays("Days 1, 2 & 8")` → `["Day 1","Day 2","Day 8"]`. La reconstrucción necesita los números (`[1,2,8]`). Agregamos `parseDayNumbers` y `parseCityDays` pasa a reusarlo (sin cambiar su salida).

**Files:**
- Test: `lib/map/parse-city-days.test.ts` (modificar)
- Modify: `lib/map/parse-city-days.ts`

- [ ] **Step 1: Escribir el test que falla**

En `lib/map/parse-city-days.test.ts`, cambiar la línea de import y agregar un `describe` nuevo al final del archivo:

```ts
import { parseCityDays, parseDayNumbers } from './parse-city-days';
```

```ts
describe('parseDayNumbers', () => {
  it('pulls the day numbers out of a multi-day string', () => {
    expect(parseDayNumbers('Days 1, 2, 6 & 7')).toEqual([1, 2, 6, 7]);
  });

  it('handles a single day', () => {
    expect(parseDayNumbers('Day 12')).toEqual([12]);
  });

  it('returns an empty array when there are no numbers', () => {
    expect(parseDayNumbers('Flexible')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseDayNumbers('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test parse-city-days`
Expected: FAIL — `parseDayNumbers` no está exportado (error de import / "is not a function").

- [ ] **Step 3: Implementar**

Reemplazar el contenido completo de `lib/map/parse-city-days.ts` por:

```ts
// A city's `days` is a human string like "Days 1, 2 & 8". `parseDayNumbers`
// pulls the raw day numbers out (→ [1, 2, 8]); `parseCityDays` renders them as
// "Day N" for the experience day selector. Both return empty when the string
// has no day numbers — `parseCityDays` then falls back to the raw string so a
// free-form value like "Flexible" still shows.
export function parseDayNumbers(days: string): number[] {
  const numbers = days.match(/\d+/g);
  if (!numbers) return [];
  return numbers.map((n) => Number(n));
}

export function parseCityDays(days: string): string[] {
  const numbers = parseDayNumbers(days);
  if (numbers.length === 0) {
    return days ? [days] : [];
  }
  return numbers.map((n) => `Day ${n}`);
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `pnpm test parse-city-days`
Expected: PASS — los tests nuevos de `parseDayNumbers` y los existentes de `parseCityDays` (que no cambiaron de salida) en verde.

- [ ] **Step 5: Commit**

```bash
git add lib/map/parse-city-days.ts lib/map/parse-city-days.test.ts
git commit -m "feat(map): extract parseDayNumbers from parseCityDays"
```

---

## Task 2: `buildRouteLegs` — reconstruir el orden del recorrido

Función pura que convierte `City[]` (cada una con su `days`) en la lista ordenada de tramos. Acá vive el manejo de revisitas y de dos ciudades en el mismo día.

**Files:**
- Test: `lib/map/route-path.test.ts` (crear)
- Create: `lib/map/route-path.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `lib/map/route-path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { City } from './cities';
import { buildRouteLegs } from './route-path';

const city = (id: string, days: string, lon: number, lat: number): City => ({
  id,
  name: id,
  country: 'X',
  image: '/x.png',
  days,
  lon,
  lat,
});

describe('buildRouteLegs', () => {
  it('returns no legs for an empty itinerary', () => {
    expect(buildRouteLegs([])).toEqual([]);
  });

  it('returns no legs for a single city', () => {
    expect(buildRouteLegs([city('only', 'Day 1', 0, 0)])).toEqual([]);
  });

  it('links cities in day order', () => {
    const legs = buildRouteLegs([
      city('a', 'Day 1', 0, 0),
      city('b', 'Day 2', 1, 0),
      city('c', 'Day 3', 2, 0),
    ]);
    expect(legs.map((l) => [l.fromId, l.toId])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
    expect(legs.every((l) => l.repeatIndex === 0)).toBe(true);
  });

  it('collapses consecutive days at the same city', () => {
    const legs = buildRouteLegs([city('a', 'Days 1 & 2', 0, 0), city('b', 'Day 3', 1, 0)]);
    expect(legs).toHaveLength(1);
    expect([legs[0].fromId, legs[0].toId]).toEqual(['a', 'b']);
  });

  it('produces a return leg on revisit, with a growing repeatIndex', () => {
    const legs = buildRouteLegs([city('a', 'Days 1 & 3', 0, 0), city('b', 'Day 2', 1, 0)]);
    expect(legs.map((l) => [l.fromId, l.toId, l.repeatIndex])).toEqual([
      ['a', 'b', 0],
      ['b', 'a', 1],
    ]);
  });

  it('orders cities that share a day by their position in the array', () => {
    const legs = buildRouteLegs([
      city('start', 'Day 1', 0, 0),
      city('tulln', 'Day 2', 1, 0),
      city('wachau', 'Day 2', 2, 0),
      city('end', 'Day 3', 3, 0),
    ]);
    expect(legs.map((l) => l.toId)).toEqual(['tulln', 'wachau', 'end']);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test route-path`
Expected: FAIL — `lib/map/route-path.ts` no existe (error de resolución de módulo).

- [ ] **Step 3: Implementar**

Crear `lib/map/route-path.ts`:

```ts
import type { City } from '@/lib/map/cities';
import { parseDayNumbers } from '@/lib/map/parse-city-days';

// One hop of the voyage, from one stop to the next in day order. `repeatIndex`
// counts how many earlier legs already ran along the same undirected corridor,
// so the geometry can fan repeated passes out instead of stacking them.
export type RouteLeg = {
  from: [number, number]; // [lon, lat]
  to: [number, number];
  fromId: string;
  toId: string;
  repeatIndex: number;
};

type Visit = { day: number; cityIndex: number; id: string; lon: number; lat: number };

// Rebuild the ordered voyage from the cities' free-text `days`. A city can
// appear on several days (and several cities can share a day), so we expand to
// one occurrence per day, sort by day — breaking ties by the city's position in
// the array, which already runs along the river — drop consecutive repeats of
// the same city, and connect what's left.
export function buildRouteLegs(cities: City[]): RouteLeg[] {
  const occurrences: Visit[] = [];
  cities.forEach((city, cityIndex) => {
    const days = parseDayNumbers(city.days);
    // No parseable day → fall back to array position so it still orders sanely.
    const effectiveDays = days.length > 0 ? days : [cityIndex];
    for (const day of effectiveDays) {
      occurrences.push({ day, cityIndex, id: city.id, lon: city.lon, lat: city.lat });
    }
  });

  occurrences.sort((a, b) => a.day - b.day || a.cityIndex - b.cityIndex);

  const visits: Visit[] = [];
  for (const occ of occurrences) {
    const prev = visits[visits.length - 1];
    if (prev && prev.id === occ.id) continue; // same city two days running = one stop
    visits.push(occ);
  }

  const corridorCount = new Map<string, number>();
  const legs: RouteLeg[] = [];
  for (let i = 0; i < visits.length - 1; i++) {
    const a = visits[i];
    const b = visits[i + 1];
    const key = [a.id, b.id].sort().join('—'); // undirected: A→B and B→A share a corridor
    const repeatIndex = corridorCount.get(key) ?? 0;
    corridorCount.set(key, repeatIndex + 1);
    legs.push({
      from: [a.lon, a.lat],
      to: [b.lon, b.lat],
      fromId: a.id,
      toId: b.id,
      repeatIndex,
    });
  }
  return legs;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `pnpm test route-path`
Expected: PASS — los 6 tests de `buildRouteLegs` en verde.

- [ ] **Step 5: Commit**

```bash
git add lib/map/route-path.ts lib/map/route-path.test.ts
git commit -m "feat(map): reconstruct ordered route legs from city days"
```

---

## Task 3: geometría del arco — `routeFeatureCollection`

Convierte los tramos en GeoJSON: un arco Bézier por tramo, con offset por `repeatIndex` para que las pasadas repetidas se abran en abanico.

**Files:**
- Test: `lib/map/route-path.test.ts` (modificar)
- Modify: `lib/map/route-path.ts`

- [ ] **Step 1: Escribir el test que falla**

En `lib/map/route-path.test.ts`, cambiar la línea de import y agregar un `describe` nuevo al final:

```ts
import { buildRouteLegs, routeFeatureCollection } from './route-path';
```

```ts
describe('routeFeatureCollection', () => {
  it('builds one LineString feature per leg', () => {
    const fc = routeFeatureCollection([
      city('a', 'Day 1', 0, 0),
      city('b', 'Day 2', 2, 1),
      city('c', 'Day 3', 4, 0),
    ]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe('LineString');
  });

  it('starts and ends each arc exactly on the leg endpoints', () => {
    const fc = routeFeatureCollection([city('a', 'Day 1', 0, 0), city('b', 'Day 2', 2, 1)]);
    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toEqual([0, 0]);
    expect(coords[coords.length - 1]).toEqual([2, 1]);
  });

  it('carries the leg repeatIndex onto the feature properties', () => {
    const fc = routeFeatureCollection([city('a', 'Days 1 & 3', 0, 0), city('b', 'Day 2', 2, 0)]);
    expect(fc.features.map((f) => f.properties.repeatIndex)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test route-path`
Expected: FAIL — `routeFeatureCollection` no está exportado.

- [ ] **Step 3: Implementar**

Agregar al final de `lib/map/route-path.ts`:

```ts
// --- arc geometry -----------------------------------------------------------

// A leg drawn as a curved line. Structurally a GeoJSON LineString Feature, kept
// as a local type so this module needs no extra dependency; it is assignable to
// the GeoJSON.FeatureCollection that MapLibre's addSource/setData expect.
export type RouteLineFeature = {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: { repeatIndex: number };
};

export type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: RouteLineFeature[];
};

// Points sampled along each Bézier arc.
const ARC_SAMPLES = 28;
// Bow of a single arc, as a fraction of the leg's straight length…
const BASE_OFFSET_RATIO = 0.18;
// …clamped (degrees) so short legs still curve and the long return leg doesn't balloon.
const MIN_OFFSET = 0.04;
const MAX_OFFSET = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Quadratic Bézier from `from` to `to`, bowed sideways. Repeated corridors
// alternate sides and grow with each pass, so the boat's two trips along the
// same stretch sit side by side instead of on top of each other.
function legToFeature(leg: RouteLeg): RouteLineFeature {
  const [x1, y1] = leg.from;
  const [x2, y2] = leg.to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  // Unit vector perpendicular to the straight chord.
  const px = length === 0 ? 0 : -dy / length;
  const py = length === 0 ? 0 : dx / length;

  const side = leg.repeatIndex % 2 === 0 ? 1 : -1;
  const step = Math.floor(leg.repeatIndex / 2) + 1;
  const offset = clamp(length * BASE_OFFSET_RATIO, MIN_OFFSET, MAX_OFFSET) * side * step;

  // Control point: chord midpoint pushed out along the perpendicular.
  const cx = (x1 + x2) / 2 + px * offset;
  const cy = (y1 + y2) / 2 + py * offset;

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = i / ARC_SAMPLES;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
    const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    coordinates.push([x, y]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: { repeatIndex: leg.repeatIndex },
  };
}

// Full route as GeoJSON, ready to hand to a MapLibre geojson source.
export function routeFeatureCollection(cities: City[]): RouteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: buildRouteLegs(cities).map(legToFeature),
  };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `pnpm test route-path`
Expected: PASS — los tests de `buildRouteLegs` y `routeFeatureCollection` en verde. (Los endpoints son exactos: en un Bézier cuadrático `t=0` da `P0` y `t=1` da `P1`.)

- [ ] **Step 5: Commit**

```bash
git add lib/map/route-path.ts lib/map/route-path.test.ts
git commit -m "feat(map): turn route legs into bowed bezier geojson arcs"
```

---

## Task 4: `RouteLayer` — pintar la ruta en el mapa

Componente que espeja `CityCardLayer`: recibe `map` + `cities`, maneja source y capas de forma imperativa, no renderiza DOM. No lleva test unitario (por `conventions/testing.md` los componentes React se verifican en el dev panel).

**Files:**
- Create: `components/panels/map/route-layer.tsx`

- [ ] **Step 1: Crear el componente**

Crear `components/panels/map/route-layer.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { City } from '@/lib/map/cities';
import { routeFeatureCollection } from '@/lib/map/route-path';

// green-700 (styles/globals.css). MapLibre paint needs a hex literal — same as
// the parchment style's palette — so it lives beside the layer that uses it.
const ROUTE_COLOR = '#39473c';

const SOURCE_ID = 'route';
const LINE_LAYER_ID = 'route-line';
const ARROW_LAYER_ID = 'route-arrows';
const ARROW_IMAGE_ID = 'route-arrow';

type RouteLayerProps = {
  map: maplibregl.Map;
  cities: City[];
};

/**
 * Draws the boat's voyage as curved arcs (one per leg) with a direction arrow at
 * each arc's center. Mirrors CityCardLayer: it manages its MapLibre source and
 * layers imperatively and renders no DOM of its own. map-canvas only mounts it
 * after the map's style has loaded, so addSource/addLayer are safe immediately.
 */
export function RouteLayer({ map, cities }: RouteLayerProps) {
  useEffect(() => {
    const data = routeFeatureCollection(cities);
    ensureArrowImage(map);

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 2.5, 'line-opacity': 0.7 },
      });
      map.addLayer({
        id: ARROW_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'symbol-placement': 'line-center',
          'icon-image': ARROW_IMAGE_ID,
          'icon-size': 0.5,
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
    }

    return () => {
      if (map.getLayer(ARROW_LAYER_ID)) map.removeLayer(ARROW_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, cities]);

  return null;
}

// Bake a small green triangle (pointing +x) into the map's sprite once. With
// `symbol-placement: line-center` MapLibre rotates it to the leg's bearing, so
// it points the way the boat travels (legs run from→to).
function ensureArrowImage(map: maplibregl.Map) {
  if (map.hasImage(ARROW_IMAGE_ID)) return;
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = ROUTE_COLOR;
  ctx.beginPath();
  ctx.moveTo(3, 3);
  ctx.lineTo(size - 3, size / 2);
  ctx.lineTo(3, size - 3);
  ctx.closePath();
  ctx.fill();
  const { width, height, data } = ctx.getImageData(0, 0, size, size);
  map.addImage(ARROW_IMAGE_ID, { width, height, data });
}
```

- [ ] **Step 2: Verificar que lint y tests siguen verdes**

Run: `pnpm lint && pnpm test`
Expected: PASS. (El componente todavía no se importa en ningún lado; sirve para confirmar que compila y no rompe nada.)

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/route-layer.tsx
git commit -m "feat(map): add RouteLayer drawing the voyage as arcs with arrows"
```

---

## Task 5: enganchar `RouteLayer` en `map-canvas.tsx`

**Files:**
- Modify: `components/panels/map/map-canvas.tsx`

- [ ] **Step 1: Agregar el import**

En `components/panels/map/map-canvas.tsx`, después de la línea de import de `CityCardLayer` (línea 6):

```tsx
import { CityCardLayer } from '@/components/panels/map/city-card-layer';
import { RouteLayer } from '@/components/panels/map/route-layer';
```

- [ ] **Step 2: Renderizar la capa**

En el `return`, reemplazar el bloque condicional de `CityCardLayer` (líneas ~115-117) por:

```tsx
      {map && !focusCity && <RouteLayer map={map} cities={cityList} />}
      {map && !focusCity && (
        <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
      )}
```

La condición `map && !focusCity` es la misma de las tarjetas: en modo detalle (foco en una ciudad) la ruta se oculta junto con ellas.

- [ ] **Step 3: Verificar lint + tests**

Run: `pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 4: Verificación visual (manual, dev panel)**

Run: `pnpm dev` → abrir la app → en el DevPanel elegir view type `itinerary`, mock **"Danube Legends (agent payload)"**. Verificar:
- Hay arcos curvos verdes uniendo las ciudades en orden de día.
- El tramo de vuelta **Vienna → Budapest** (día 5→6) se ve como un arco propio.
- Los tramos repetidos (p. ej. Budapest→Bratislava) no quedan uno encima del otro: se abren a lados opuestos.
- Cada arco tiene una flecha en el medio apuntando en el sentido de avance.
- Al elegir el mock **"Detail open (Vienna)"** (o abrir una ciudad), la ruta desaparece; al cerrar el detalle, vuelve.

> Nota: verificación visual manual del desarrollador. No automatizar con browser salvo pedido explícito.

- [ ] **Step 5: Commit**

```bash
git add components/panels/map/map-canvas.tsx
git commit -m "feat(map): show the route on the itinerary map"
```

---

## Task 6: gate final antes de cerrar

**Files:** ninguno (verificación).

- [ ] **Step 1: Formatear**

Run: `pnpm format`
Expected: prettier deja el código consistente (puede no cambiar nada).

- [ ] **Step 2: Lint + tests (regla dura)**

Run: `pnpm lint && pnpm test`
Expected: ambos en verde. Si algo falla, arreglar la causa raíz — no deshabilitar reglas ni saltear tests.

- [ ] **Step 3: Build opcional (atrapa lo que lint no ve)**

Run: `pnpm build`
Expected: build de Next.js OK (confirma que los tipos GeoJSON estructurales calzan con MapLibre).

- [ ] **Step 4: Commit de formato si hubo cambios**

```bash
git add -A
git commit -m "chore: format" || echo "nada que formatear"
```

Implementación completa. **No** mergear ni pushear a `main` sin el OK explícito del usuario (ver `superpowers:finishing-a-development-branch` para PR/merge).

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** reconstrucción desde `days` (Task 1+2) · desempate mismo día (Task 2, test `share a day`) · colapso de consecutivas (Task 2) · revisita + offset de corredor (Task 2 `repeatIndex`, Task 3 abanico) · arcos Bézier (Task 3) · capa de línea + flechas + color green-700 (Task 4) · ocultar en modo detalle (Task 5) · tests solo en `lib/**` (Task 1-3) · solo vista `itinerary` (Task 5). Todo cubierto.
- **Sin placeholders:** cada step trae el código/comando real.
- **Consistencia de tipos:** `City`, `parseDayNumbers`, `RouteLeg`, `buildRouteLegs`, `RouteLineFeature`, `RouteFeatureCollection`, `routeFeatureCollection`, `RouteLayer`, `SOURCE_ID`/`LINE_LAYER_ID`/`ARROW_LAYER_ID`/`ARROW_IMAGE_ID` se usan idénticos entre tasks. `routeFeatureCollection` toma `City[]`, igual que `cityList` en `map-canvas.tsx`.
