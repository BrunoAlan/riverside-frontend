# Botón "reencuadrar itinerario"

**Fecha:** 2026-06-25
**Branch:** `feat/limit-map-zoom-out` (junto al cambio de límite de zoom-out)

## Problema

Después de hacer pan/zoom en el mapa, el usuario puede "perder" el itinerario
de vista y no tiene forma rápida de volver a encuadrar todas las ciudades. La
única manera es alejar/mover la cámara a mano.

## Objetivo

Agregar un botón sobre el mapa que reencuadre la cámara para mostrar todas las
ciudades del itinerario, apilado sobre el control de zoom (+/−) y con el mismo
estilo.

## Decisión de enfoque

El control de zoom es un `NavigationControl` nativo de MapLibre (DOM propio),
ya estilado en `styles/globals.css` con la clase `.maplibregl-ctrl-group`
(fondo beige, borde, `radius-xl`, sombra). Por eso el botón de reencuadre se
implementa como **otro control nativo de MapLibre** (`IControl` de DOM crudo)
agregado a la misma esquina:

- Hereda automáticamente el estilo del grupo de controles.
- Se apila de forma determinística sobre el zoom (según orden de `addControl`).
- Queda como hermano del control de zoom, que también es DOM crudo (no shadcn).

Un overlay React/shadcn quedaría con posicionamiento absoluto frágil sobre un
control de altura variable y no compartiría el "pill" del grupo.

## Cambios

Todo en `components/panels/map/map-canvas.tsx`.

### 1. Extraer la lógica de encuadre a un callback reutilizable

`frameItinerary(animate: boolean)` (`useCallback`, deps `[map, cityList, center, zoom]`):

- `cityList.length >= 2` y hay bounds → `map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate })`
- si no → `animate ? map.easeTo({ center, zoom }) : map.jumpTo({ center, zoom })`

El effect de cámara existente lo usa con `animate: false` (carga inicial, sin
jank). El botón lo usa con `animate: true` (transición suave). El branch de
`focusCity` (detalle) queda igual en el effect.

### 2. Control custom de MapLibre

`IControl` con `onAdd` que crea un `div.maplibregl-ctrl.maplibregl-ctrl-group`
con un `<button type="button" aria-label="Recenter itinerary">` que contiene un
SVG inline de ícono "fit/encuadre" (estilo phosphor `CornersIn`). Se inlinea el
SVG porque es un control DOM crudo, igual que el de zoom. Se agrega con
`addControl(recenterControl, 'bottom-right')` **antes** del `NavigationControl`
para que quede arriba.

### 3. Frescura del closure

El control se crea una sola vez en el effect de creación del mapa, así que su
handler de click llama a `frameItineraryRef.current?.(true)`. Un ref
(`frameItineraryRef`) se mantiene sincronizado con el `frameItinerary` actual
(que cambia de identidad cuando cambia el itinerario) vía un effect.

### 4. Visibilidad

El botón se oculta en modo detalle (`focusCity` definido), porque ahí ya existe
la "X" de la `CityDetailCard` y reencuadrar dejaría un estado inconsistente
(cámara en overview pero card de detalle abierta). Se togglea con
`element.style.display` en un effect sobre `focusCity` — no se remueve/re-agrega
el control, para no alterar el orden de apilado.

## Boundary

`MapCanvas` sigue siendo presentacional: no toca `uiViewStore`, intents ni
analytics. Reencuadrar es pura manipulación de cámara. Volver del detalle al
itinerario sigue siendo responsabilidad de `PanelMap` (la "X").

## Fuera de alcance

- No se reemplaza el `NavigationControl` ni se reimplementan los botones de zoom.
- No se cambia el comportamiento de zoom-in, auto-fit ni el encuadre inicial.

## Verificación

- `pnpm lint` limpio.
- `pnpm test` verde (suite existente; no se agregan tests para `map-canvas.tsx`:
  depende de MapLibre/WebGL, inviable en jsdom sin mocking pesado de bajo valor,
  y no hay tests para ese archivo hoy).
- Manual: pan/zoom en el mapa → click en el botón → la cámara vuelve a encuadrar
  todas las ciudades; el botón no aparece en modo detalle.
