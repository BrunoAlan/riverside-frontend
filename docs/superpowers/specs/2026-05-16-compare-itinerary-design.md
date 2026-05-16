# CompareItinerary — Diseño

## Objetivo

Nuevo content panel que muestra dos instancias del mapa lado a lado, separadas por
un divisor visual central con el logo de Riverside. Cada mapa muestra un itinerario
distinto y se navega de forma independiente.

## Alcance

Incluye:
- Refactor de `MapCanvas` para recibir sus datos por props.
- Dos itinerarios hardcodeados.
- Panel `CompareItinerary` con dos mapas + divisor central.
- Registro en el `registry` de content panels.

Fuera de alcance:
- Barras de resumen inferiores (ubicación, fechas, precio, "Select Itinerary").
- Slider arrastrable estilo before/after.
- Sincronización de pan/zoom entre los mapas.
- Datos reales desde backend (los itinerarios son hardcodeados).

## Arquitectura

```
registry.ts
  └─ CompareItinerary            (components/app/content-panels/compare-itinerary.tsx)
       ├─ MapCanvas (itinerario A)   ← mitad izquierda
       ├─ Divisor central + logo
       └─ MapCanvas (itinerario B)   ← mitad derecha

MapCanvas  ← refactorizado: recibe cities/center/zoom por props
lib/map/itineraries.ts  ← tipo Itinerary + datasets A y B
```

## Componentes

### 1. `lib/map/itineraries.ts` (nuevo)

```ts
import type { City } from '@/lib/map/cities';

export type Itinerary = {
  id: string;
  label: string;
  cities: City[];
  center: [number, number]; // [lon, lat]
  zoom: number;
};

export const itineraries: Itinerary[]; // dos entradas: A y B
```

- Reutiliza el tipo `City` existente.
- Cada itinerario define su propio `center`/`zoom` para encuadrar sus ciudades.
- Las ciudades pueden reutilizar las de `cities.ts`; cada itinerario tiene su
  propio subconjunto/orden. No se requieren imágenes nuevas (se reusan las de
  `public/map`).

### 2. `components/app/content-panels/map-canvas.tsx` (refactor)

Agregar props, manteniendo compatibilidad con `PanelMap`:

```ts
type MapCanvasProps = {
  cities?: City[];                  // default: cities importado de cities.ts
  center?: [number, number];        // default: [17.5, 48.0]
  zoom?: number;                    // default: 6.8
  onCityExpand?: (city: City) => void;
};
```

- Los valores actuales pasan a ser defaults → `PanelMap` no cambia.
- El `useEffect` ya depende de `onCityExpand`; agregar `cities`, `center`, `zoom`
  a las dependencias para que el mapa se reconstruya si cambian.

### 3. `components/app/content-panels/compare-itinerary.tsx` (nuevo)

- `div` con `fixed inset-0`.
- Flex row con dos mitades (`w-1/2` / `flex-1` cada una), cada una renderiza
  `<MapCanvas>` con su itinerario (`cities`, `center`, `zoom`).
- Cada mapa hace pan/zoom de forma independiente (sin estado compartido).
- Divisor central: banda/línea vertical absolutamente posicionada en el centro,
  con `pointer-events-none`. El logo `riverside-logo.svg` va en una tarjeta beige
  centrada en la parte superior del divisor, siguiendo el estilo de `AgentHeader`.

### 4. `components/app/content-panels/registry.ts` (editar)

Agregar:

```ts
{ id: 'compare', label: 'Comparar itinerarios', component: CompareItinerary }
```

## Flujo de datos

`registry` → `CompareItinerary` → dos `MapCanvas` (cada uno con un `Itinerary`)
→ marcadores `CityCard` por ciudad.

Sin estado nuevo. `onCityExpand` puede quedar como stub (`console.log`), igual que
en `PanelMap`.

## Manejo de errores

No hay nuevas fuentes de error. `MapCanvas` ya maneja su ciclo de vida (creación y
cleanup del mapa, roots y markers). Dos instancias coexisten sin conflicto: cada una
tiene su propio contenedor DOM y sus propios `createRoot`.

## Testing / verificación

- El proyecto no tiene setup de tests de componentes; no se agregan tests unitarios.
- Verificación: chequeo de TypeScript y lint.
- Sin verificación en browser salvo que el usuario lo pida.
```
