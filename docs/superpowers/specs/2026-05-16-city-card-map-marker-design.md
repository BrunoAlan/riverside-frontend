# CityCard como marker en el mapa — Diseño

**Fecha:** 2026-05-16

## Objetivo

Mostrar tarjetas (`CityCard`) ancladas a coordenadas dentro del mapa MapLibre
(`map-canvas.tsx`). Cada tarjeta representa una ciudad con su foto, nombre, país,
un pill de días y un botón de expandir.

## Referencia visual

Card blanca redondeada con sombra suave:
- Imagen de la ciudad arriba, esquinas redondeadas.
- Pill superpuesto arriba-centro de la imagen con el texto de días (ej. "Days 1, 2 & 8").
- Debajo: nombre de ciudad en negrita + país en gris.
- Botón ghost con icono de expandir a la derecha de la fila inferior.

## Componentes

### 1. Datos — `lib/map/cities.ts`

```ts
export type City = {
  id: string;
  name: string;     // "Vienna"
  country: string;  // "Austria"
  image: string;    // "/map/viena.png"
  days: string;     // "Days 1, 2 & 8" — string libre, ya formateado
  lon: number;
  lat: number;
};

export const cities: City[] = [
  { id: 'vienna',        name: 'Vienna',        country: 'Austria',  image: '/map/viena.png',         days: 'Days 1, 2 & 8', lon: 16.3738, lat: 48.2082 },
  { id: 'bratislava',    name: 'Bratislava',    country: 'Slovakia', image: '/map/bratislava.png',    days: 'Days 3 & 4',    lon: 17.1077, lat: 48.1486 },
  { id: 'wachau-valley', name: 'Wachau Valley', country: 'Austria',  image: '/map/Wachau Valley.png', days: 'Days 5, 6 & 7', lon: 15.4214, lat: 48.3797 },
];
```

### 2. Componente — `components/app/content-panels/city-card.tsx`

`CityCard` presentacional. Props:

```ts
type CityCardProps = {
  city: City;
  onExpand?: (city: City) => void;
};
```

Estructura:
- shadcn `Card` con ancho fijo (~220px), padding ajustado.
- Wrapper `relative`:
  - `next/image` con la foto, esquinas redondeadas, `width`/`height` fijos.
  - Pill `absolute` arriba-centro mostrando `city.days`.
- Fila inferior (`flex` con `justify-between`):
  - Columna: `city.name` en negrita, `city.country` en gris.
  - Botón ghost (shadcn `Button` variant `ghost` o icon) con icono de expandir
    de `@phosphor-icons/react`, `onClick={() => onExpand?.(city)}`.

### 3. Markers — `components/app/content-panels/map-canvas.tsx`

En el `useEffect` existente, después de crear el mapa, por cada ciudad:
- Crear un `div` contenedor.
- Montar `<CityCard city={...} onExpand={...} />` con `createRoot` de
  `react-dom/client`.
- Anclar con `new maplibregl.Marker({ element: div }).setLngLat([lon, lat]).addTo(map)`.

Cleanup del `useEffect`: por cada marker `marker.remove()` y por cada root
`root.unmount()`, además del `map.remove()` ya presente.

### 4. Callback `onExpand`

- `MapCanvas` recibe prop opcional `onCityExpand?: (city: City) => void` y la
  pasa a cada `CityCard`.
- `PanelMap` pasa un stub por ahora (sin lógica definida del lado del padre).

## Flujo de datos

`cities` (array estático) → `MapCanvas` itera y crea un marker por ciudad →
cada marker renderiza un `CityCard` → click en expandir → `onExpand(city)` →
`onCityExpand` de `MapCanvas` → stub en `PanelMap`.

## Fuera de alcance

- Lógica real del botón expandir (qué hace el padre).
- Fuente de datos remota (API) — por ahora array estático.
- Interacción de hover/selección de markers.
