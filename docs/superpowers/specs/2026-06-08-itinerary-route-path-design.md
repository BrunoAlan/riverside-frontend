# Recorrido del barco en el itinerario — diseño

**Fecha:** 2026-06-08
**Vista:** `itinerary` (panel de mapa)
**Estado:** Implementado

## Objetivo

Dibujar el recorrido sobre el mapa MapLibre del itinerario como **una sola línea
recta que conecta las ciudades ordenadas de oeste a este** (cada una una vez).
Sin loops de ida y vuelta, sin flechas, sin depender de los días.

> **Nota de alcance.** La primera exploración proponía arcos por día con las
> revisitas visibles (el barco vuelve a una ciudad → su propio arco). Tras verlo
> se simplificó: los loops de revisita generaban un trazo confuso. El diseño
> final es esta línea simple; la exploración de arcos quedó descartada (vive en
> el historial de git si se necesita).

## Decisiones (finales)

| Decisión | Elección |
| --- | --- |
| Forma | **Una línea recta** que une las ciudades ordenadas oeste→este (por longitud) |
| Orden | **Geográfico** (longitud), no por día — así la línea no vuelve atrás |
| Revisitas / loops | **No** — cada ciudad se conecta una vez, sin volver |
| Flechas de dirección | **No** |
| Animación | **No** (estática) |
| Alcance | **Solo la vista `itinerary`** (no `compare_itinerary`) |

## Implementación

- **`lib/map/route-path.ts`** — `routeFeatureCollection(cities)`: arma un GeoJSON
  `FeatureCollection` con **un solo `LineString`** cuyas coordenadas son las
  ciudades **ordenadas oeste→este por longitud** (`[...cities].sort((a, b) =>
  a.lon - b.lon)` — ordena una copia, no muta el input). Con menos de dos ciudades
  no hay línea (colección vacía). Tipo GeoJSON local, sin dependencias nuevas.
- **`components/panels/map/route-layer.tsx`** — espeja `CityCardLayer`: recibe
  `{ map, cities }`, agrega una capa `line` (`route-line`, green-700 `#39473c`,
  ancho 2.5, opacidad 0.7) sobre una source `route`, y la limpia al desmontar.
  Dos efectos: setup/teardown en `[map]`, `setData` en `[map, cities]` (un cambio
  de itinerario actualiza la data sin reconstruir la capa).
- **`map-canvas.tsx` + `panel-map.tsx`** — `MapCanvas` es compartido con
  `compare_itinerary`, así que la línea es **opt-in** vía prop `showRoute`
  (default off) + gate `map && showRoute && !focusCity` (se oculta en modo
  detalle). Solo `PanelMap` (vista `itinerary`) pasa `showRoute`;
  `compare-itinerary-view.tsx` no → línea off allí.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `lib/map/route-path.ts` | **Nuevo** — `routeFeatureCollection`: un `LineString` por las ciudades ordenadas oeste→este (por longitud). Puro, sin MapLibre. |
| `lib/map/route-path.test.ts` | **Nuevo** — tests: vacío / una ciudad → sin línea; ≥2 → `LineString` ordenado oeste→este; no muta el input. |
| `components/panels/map/route-layer.tsx` | **Nuevo** — capa de línea sobre el mapa, espeja `CityCardLayer`. |
| `components/panels/map/map-canvas.tsx` | **Editar** — prop `showRoute` (default off) + render con `map && showRoute && !focusCity`. |
| `components/panels/map/panel-map.tsx` | **Editar** — pasar `showRoute` (activa la línea solo en `itinerary`). |

## Testing

Por `conventions/testing.md` solo se recolecta `lib/**/*.test.ts`. El riesgo real
está en `route-path.ts`, cubierto en `route-path.test.ts` (sin línea con 0/1
ciudad; un `LineString` con las coordenadas en orden con ≥2). `route-layer.tsx` y
el wiring se verifican en el dev panel (mock `Danube Legends`). `pnpm lint` +
`pnpm test` verdes antes de cualquier push.
