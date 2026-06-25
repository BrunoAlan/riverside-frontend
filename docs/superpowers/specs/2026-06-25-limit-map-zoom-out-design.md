# Limitar el zoom-out del mapa

**Fecha:** 2026-06-25
**Branch:** `feat/limit-map-zoom-out`

## Problema

El mapa (`components/panels/map/map-canvas.tsx`) se crea con MapLibre sin un piso
de zoom. El usuario puede alejar la cámara (scroll o el botón "−" del
`NavigationControl`) hasta ver el continente o el mundo entero, lo que rompe la
estética de "región del Danubio" y deja la vista vacía de contexto útil.

## Objetivo

Poner un piso duro al zoom-out interactivo para que la cámara no pueda alejarse
más allá de la región del Danubio, sin tocar el zoom-in, el auto-fit ni el
encuadre inicial.

## Cambio

En `components/panels/map/map-canvas.tsx`:

1. Nueva constante junto a las demás constantes de zoom (≈ línea 19):

   ```ts
   // Floor on interactive zoom-out so the user can't pull back past the Danube region.
   const MIN_ZOOM = 5.5;
   ```

2. Pasar `minZoom: MIN_ZOOM` al constructor `new maplibregl.Map({...})` (≈ línea 57).

## Por qué

- `minZoom` es una opción nativa de MapLibre que aplica un tope duro al zoom-out
  para todos los caminos de interacción (scroll y `NavigationControl`).
- `5.5` queda por debajo del `DEFAULT_ZOOM` (6.8) y permite alejar un poco más
  que la vista inicial para ver toda la región, pero corta antes del
  continente/mundo.
- No interfiere con las otras constantes de cámara, todas por encima del piso:
  `DEFAULT_ZOOM` 6.8, `DETAIL_ZOOM` 8.5, `FIT_MAX_ZOOM` 9.

## Fuera de alcance

- No se cambia el zoom máximo (zoom-in).
- No se cambia el auto-fit (`fitBounds` / `FIT_MAX_ZOOM`).
- No se cambia `center` ni `DEFAULT_ZOOM`.

## Verificación

- `pnpm lint` limpio.
- No hay tests para `map-canvas.tsx` hoy; un unit test de una opción de config
  sobre MapLibre requeriría mockear la librería sin valor real, así que la
  verificación funcional es manual (intentar alejar el mapa y confirmar que se
  detiene en el nivel 5.5).
