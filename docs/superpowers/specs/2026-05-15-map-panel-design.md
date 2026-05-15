# Map Panel — Design

Date: 2026-05-15

## Goal

Add a new switchable content panel that displays an interactive map with a
muted, parchment/paper aesthetic — matching the Riverside luxury-cruise look.
This work covers the map only; itinerary layers (pins, route, cards, popups)
come later.

## Scope

In scope:

- New `PanelMap` content panel, interactive (zoom / pan / rotate).
- Custom MapLibre style with a beige, label-free, muted palette.
- A paper-grain texture overlay above the map to unify the apergaminado look.

Out of scope (deferred):

- Destination pins, route polyline, popups, auto-fit to itinerary.
- Itinerary-driven cards.

## Stack

- `maplibre-gl` — open-source map renderer, no API key.
- OpenFreeMap (`tiles.openfreemap.org`, OpenMapTiles schema) — free public
  vector tiles, no key or usage limit.

## Components

### `components/app/content-panels/panel-map.tsx`

Client component. Mounts a MapLibre map into a `<div>`, centered on the Danube
region (roughly Vienna / Wachau Valley). Interactive: zoom, pan, rotate.

MapLibre requires `window`, so the panel is loaded with
`dynamic(() => import(...), { ssr: false })`. The map instance is created in a
`useEffect` against a ref, and cleaned up (`map.remove()`) on unmount.

The component renders, layered:

1. The map container (`<div>`, fills the panel).
2. A paper-grain overlay `<div>`, absolutely positioned, covering the map.

### `lib/map/parchment-style.ts`

Exports the MapLibre style JSON. Derived from OpenFreeMap's minimalist
"positron" style, recolored to the project's beige palette (`bg-beige-*`):

- Land / background: beige tones.
- Water and country borders: muted, low-contrast.
- Labels, POIs, road networks: hidden.

### `registry.ts`

Add `{ id: 'map', label: 'Mapa', component: PanelMap }` to `CONTENT_PANELS`.

## The paper texture

A grain asset (PNG or SVG) lives in `public/`. The overlay `<div>` uses it as
a background with `mix-blend-mode: multiply` at low opacity. The map sits
behind; the grain unifies the whole panel into the parchment look.

## Expectations

The muted palette plus the grain overlay get close to the mockup. The exact
"watercolor blotch" terrain texture depends on tuning the overlay — expect a
short iteration pass there.
