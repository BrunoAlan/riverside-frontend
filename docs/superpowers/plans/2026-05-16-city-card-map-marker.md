# CityCard Map Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `CityCard` tarjetas ancladas a coordenadas dentro del mapa MapLibre, una por ciudad de un array estático.

**Architecture:** Un array estático `cities` alimenta a `MapCanvas`, que en su `useEffect` crea un `maplibregl.Marker` por ciudad. Cada marker contiene un `div` donde se monta el componente React `CityCard` vía `createRoot`. `CityCard` es presentacional y expone `onExpand`; el callback burbujea hasta `PanelMap` mediante una prop `onCityExpand` en `MapCanvas`.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, MapLibre GL, shadcn UI (`Card`, `Button`), `@phosphor-icons/react`, `next/image`, `react-dom/client`.

**Nota sobre verificación:** El proyecto no tiene framework de tests. Cada tarea se verifica con `pnpm lint` y `pnpm build`.

---

### Task 1: Datos de ciudades

**Files:**
- Create: `lib/map/cities.ts`

- [ ] **Step 1: Crear el archivo de datos**

```ts
export type City = {
  id: string;
  name: string;
  country: string;
  image: string;
  days: string;
  lon: number;
  lat: number;
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
  },
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovakia',
    image: '/map/bratislava.png',
    days: 'Days 3 & 4',
    lon: 17.1077,
    lat: 48.1486,
  },
  {
    id: 'wachau-valley',
    name: 'Wachau Valley',
    country: 'Austria',
    image: '/map/Wachau Valley.png',
    days: 'Days 5, 6 & 7',
    lon: 15.4214,
    lat: 48.3797,
  },
];
```

- [ ] **Step 2: Verificar tipos**

Run: `pnpm lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add lib/map/cities.ts
git commit -m "feat(map): add static cities data"
```

---

### Task 2: Componente CityCard

**Files:**
- Create: `components/app/content-panels/city-card.tsx`

Referencia visual: card blanca redondeada con sombra. Arriba, foto de la ciudad
con esquinas redondeadas y un pill superpuesto arriba-centro con el texto de
días. Debajo, una fila con nombre (negrita) + país (gris) a la izquierda y un
botón ghost con icono de expandir a la derecha.

- [ ] **Step 1: Crear el componente**

```tsx
import Image from 'next/image';
import { ArrowsOutSimple } from '@phosphor-icons/react/dist/ssr';
import type { City } from '@/lib/map/cities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CityCardProps = {
  city: City;
  onExpand?: (city: City) => void;
};

export function CityCard({ city, onExpand }: CityCardProps) {
  return (
    <Card className="w-[220px] gap-0 overflow-hidden p-2.5">
      <div className="relative">
        <Image
          src={city.image}
          alt={city.name}
          width={200}
          height={130}
          className="h-[130px] w-full rounded-lg object-cover"
        />
        <span className="bg-background/90 absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap shadow-sm">
          {city.days}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div>
          <p className="text-lg leading-tight font-semibold">{city.name}</p>
          <p className="text-muted-foreground text-sm">{city.country}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Expand ${city.name}`}
          onClick={() => onExpand?.(city)}
        >
          <ArrowsOutSimple weight="bold" />
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Confirmar que `Button` existe**

Run: `ls components/ui/button.tsx`
Expected: el archivo existe. Si no, instalarlo con `pnpm dlx shadcn@latest add --yes button`.

- [ ] **Step 3: Verificar tipos y lint**

Run: `pnpm lint`
Expected: sin errores nuevos. Si `@phosphor-icons/react/dist/ssr` no resuelve, usar `@phosphor-icons/react` en su lugar.

- [ ] **Step 4: Commit**

```bash
git add components/app/content-panels/city-card.tsx
git commit -m "feat(map): add CityCard component"
```

---

### Task 3: Renderizar markers en MapCanvas

**Files:**
- Modify: `components/app/content-panels/map-canvas.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { parchmentStyle } from '@/lib/map/parchment-style';
import { cities, type City } from '@/lib/map/cities';
import { CityCard } from '@/components/app/content-panels/city-card';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

type MapCanvasProps = {
  onCityExpand?: (city: City) => void;
};

export function MapCanvas({ onCityExpand }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center: [17.5, 48.0],
      zoom: 6.8,
      attributionControl: { compact: true },
    });

    const markers: maplibregl.Marker[] = [];
    const roots: Root[] = [];

    for (const city of cities) {
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
      markers.forEach((marker) => marker.remove());
      roots.forEach((root) => root.unmount());
      map.remove();
    };
  }, [onCityExpand]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_IMAGE, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar lint**

Run: `pnpm lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/map-canvas.tsx
git commit -m "feat(map): render CityCard markers on the map"
```

---

### Task 4: Conectar onCityExpand en PanelMap

**Files:**
- Modify: `components/app/content-panels/panel-map.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

```tsx
'use client';

import dynamic from 'next/dynamic';
import { AgentHeader } from '@/components/agent/agent-header';
import type { City } from '@/lib/map/cities';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

export function PanelMap() {
  const handleCityExpand = (city: City) => {
    // TODO: wire up expand behavior (e.g. open detail panel for `city`).
    console.log('expand city', city.id);
  };

  return (
    <div className="fixed inset-0">
      <MapCanvas onCityExpand={handleCityExpand} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <AgentHeader />
      </div>
    </div>
  );
}
```

Nota: `panel-map.tsx` pasa de server a client component por usar un handler;
`'use client'` se agrega arriba. El `console.log` es un stub intencional hasta
definir el comportamiento real del expand.

- [ ] **Step 2: Verificar lint y build completo**

Run: `pnpm lint && pnpm build`
Expected: lint sin errores nuevos; build termina con éxito.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-panels/panel-map.tsx
git commit -m "feat(map): wire onCityExpand stub in PanelMap"
```

---

## Self-Review

- **Spec coverage:** Datos estáticos (Task 1), `CityCard` con imagen/pill/nombre/país/botón (Task 2), markers anclados a coordenadas con cleanup (Task 3), callback `onExpand` → `onCityExpand` → stub en `PanelMap` (Task 4). Todas las secciones del spec cubiertas.
- **Placeholders:** El único TODO es el comportamiento real del botón expandir, declarado explícitamente fuera de alcance en el spec.
- **Type consistency:** `City` definido en Task 1 y reutilizado por import en Tasks 2-4. `CityCard` props `{ city, onExpand }` consistentes entre Task 2 y Task 3. `MapCanvas` prop `onCityExpand` consistente entre Task 3 y Task 4.
