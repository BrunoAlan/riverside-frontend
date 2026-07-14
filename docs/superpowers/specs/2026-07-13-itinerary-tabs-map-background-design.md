# Excursions keeps the map visible in the background

**Fecha:** 2026-07-13
**Branch:** `feat/itinerary-tabs` (continuación del mismo feature)
**Supersede:** la sección "Excursions... reemplaza completamente el mapa (no es un
overlay)" de
[`2026-07-13-itinerary-tabs-design.md`](./2026-07-13-itinerary-tabs-design.md).
El resto de ese spec (pills, `ItineraryTabs`, contenido de `ExcursionsPanel`)
sigue vigente.

## Problema

La primera versión de `ItineraryPanel` alterna entre `PanelMap` **o**
`ExcursionsPanel` (nunca ambos), así que al tocar "Excursions" el mapa se
desmonta por completo: se pierde la cámara/zoom, el contexto WebGL se destruye
(`map.remove()`) y, al volver a "Overview", el mapa se recrea desde cero
(vuelve a `frameItinerary`/fit inicial, refetch de tiles, flash del
placeholder de carga). El pedido es que el mapa se comporte "como en el
resto" de la app: quede de fondo, visible, y solo cambien los elementos que
ya cambian hoy cuando se abre el detalle de una ciudad (las city cards, la
ruta, el control de recentrar).

## Objetivo

Mantener `PanelMap` siempre montado (nunca condicionado por la tab activa)
para que la cámara/zoom/WebGL persistan al ir y volver de Excursions. Al estar
en Excursions, el mapa se ve de fondo pero queda decorativo: sin ruta, sin
city cards, sin controles de zoom/recentrar, y sin poder hacer pan/zoom.
`ExcursionsPanel` pasa a ser un overlay centrado sobre ese fondo, igual que ya
lo es el detalle de una ciudad sobre el mapa en Overview.

## Decisión de enfoque

**Mantener ambos paneles montados, alternar con CSS.** `ItineraryPanel` ya no
usa un ternario que monta uno u otro; ambos (`PanelMap`, `ExcursionsPanel`) se
renderizan siempre, y la tab activa solo decide opacidad/`pointer-events`. Es
la única forma de no pagar el costo de recrear el `maplibregl.Map` (WebGL,
tiles, cámara) cada vez que se cambia de tab — exactamente el problema que
tiene la versión actual.

**Un solo prop nuevo (`interactive`) controla todo lo "no-Overview" del
mapa.** En vez de introducir un prop separado por cada elemento (ruta, city
cards, controles, gestos), `MapCanvas` gana un único
`interactive?: boolean` (default `true`). En `false`:
- Se suma a la condición existente de `!focusCity` para no renderizar
  `RouteLayer` ni `CityCardLayer` (mismos lugares donde hoy ya se ocultan en
  modo detalle, `map-canvas.tsx:185-188`).
- Se oculta el contenedor `.maplibregl-ctrl-bottom-right` completo (agrupa el
  `NavigationControl` de zoom y el control custom de recentrar — confirmado
  leyendo el bundle de `maplibre-gl`, ambos controles se agregan a la misma
  esquina y MapLibre los apila en un único div con esa clase). Esto es
  independiente del toggle que ya existe para ocultar *solo* el botón de
  recentrar en modo detalle (`map-canvas.tsx:168-172`) — ese sigue igual.
- Se deshabilitan los gestos del mapa vía la API nativa de MapLibre
  (`map.dragPan/scrollZoom/boxZoom/dragRotate/keyboard/doubleClickZoom/
  touchZoomRotate`, cada uno con `.enable()`/`.disable()`), así el mapa queda
  puramente decorativo sin recrear la instancia.

**El cierre del detalle de ciudad al cambiar de tab es responsabilidad de
`ItineraryPanel`, no de `PanelMap`.** Hoy `PanelMap` limpia
`detailCityId` solo desde su propio botón "X" (`handleClose`, que también
manda un intent al agente). Cambiar de tab a Excursions con una ciudad
expandida debe limpiar ese mismo estado (mismo `setViewFromUser({ type:
'itinerary', itinerary })`) pero **sin mandar ningún intent** — es limpieza
de estado por navegación entre tabs, no una acción del usuario sobre el
itinerario. `ItineraryPanel` ya es quien coordina la tab activa, así que este
efecto colateral vive ahí.

## Cambios

### 1. `components/panels/map/map-canvas.tsx`

- Nuevo prop `interactive?: boolean` (default `true`).
- `RouteLayer`/`CityCardLayer` (líneas 185-188 actuales) pasan a condicionarse
  también por `interactive` (`showRoute && !focusCity && interactive`, `!focusCity
  && interactive`).
- Nuevo `controlsContainerRef` (`useRef<HTMLElement | null>(null)`), asignado
  justo después de los dos `addControl(..., 'bottom-right')` en el efecto de
  montaje, vía `containerRef.current?.querySelector<HTMLElement>('.maplibregl-ctrl-bottom-right')`.
- Nuevo efecto: `controlsContainerRef.current.style.display = interactive ? '' : 'none'`,
  dependiente de `[interactive]`.
- Nuevo efecto: deshabilita/habilita los 7 handlers de gesto del mapa según
  `interactive`, dependiente de `[map, interactive]`.
- El efecto existente que oculta *solo* el botón de recentrar en modo detalle
  (`focusCity`) no cambia.

### 2. `components/panels/map/panel-map.tsx`

- Nuevo prop `interactive?: boolean` (default `true`), reenviado tal cual a
  `<MapCanvas interactive={interactive} .../>`. Nada más cambia — la lógica
  de `detailCity`/overlay sigue igual, confiando en que `view.detailCityId`
  ya viene limpio cuando `ItineraryPanel` cambia a Excursions (ver más abajo),
  en vez de duplicar la condición acá.

### 3. `components/panels/itinerary/itinerary-panel.tsx`

- Deja de tener un ternario `activeTab === 'overview' ? <PanelMap /> :
  <ExcursionsPanel />`. Ambos se renderizan siempre, cada uno envuelto en su
  propio `absolute inset-0`:
  - El wrapper de `PanelMap` nunca baja su opacidad (el mapa debe seguir
    viéndose), pero gana `pointer-events-none` cuando `activeTab !==
    'overview'`. Recibe `interactive={activeTab === 'overview'}`.
  - El wrapper de `ExcursionsPanel` se renderiza siempre, con `opacity-0
    pointer-events-none` cuando `activeTab !== 'excursions'` y `opacity-100`
    cuando es la tab activa. Va **después** de `PanelMap` en el JSX para
    quedar arriba en el stacking (mismo z-index, el orden del DOM decide).
- Nuevo `handleTabChange` que reemplaza pasar `setActiveTab` directo a
  `ItineraryTabs`: además de actualizar `activeTab`, si la tab nueva es
  `'excursions'` y `view.detailCityId` está seteado, llama a
  `setViewFromUser({ type: 'itinerary', itinerary: view.itinerary })` (mismo
  hook `useSetViewFromUser` que ya usa `PanelMap`) — sin mandar ningún intent.

### 4. `components/panels/itinerary/excursions-panel.tsx`

- El wrapper raíz pasa a `pointer-events-none` (antes no lo tenía, porque no
  había nada debajo a lo que dejar pasar clicks; ahora el mapa vive debajo).
- `CruiseHeroCard`'s `Card` gana `pointer-events-auto` (mismo patrón que
  `CityDetailCard`/`CityExperiencesPanel` ya usan hoy para el overlay de
  detalle de ciudad: wrapper `pointer-events-none`, cada card individual
  `pointer-events-auto`). `CityExperiencesPanel` ya trae `pointer-events-auto`
  en su propio root — no se toca.
- El contenido interno (hero card + lista de experiencias) no cambia.

## Fuera de alcance

- No se anima la transición de opacidad/blur entre tabs (cambio instantáneo).
- No se restaura el detalle de ciudad si el usuario vuelve de Excursions a
  Overview (queda cerrado, per la decisión de "se cierra automáticamente").
- No se toca `CityCardLayer`, `RouteLayer`, `CityDetailCard`, ni
  `CityExperiencesPanel` — solo se los deja de renderizar condicionalmente.
- No se persiste el `openId` de `CityExperiencesPanel` dentro de
  `ExcursionsPanel` entre cambios de tab más allá de lo que ya hace el
  componente (queda montado todo el tiempo, así que en los hechos si
  persiste, pero no es un requisito nuevo).

## Verificación

Según `conventions/testing.md`, no se agregan tests de componentes. Se
verifica manualmente vía dev panel:

- `pnpm dev` → dev panel → view `itinerary`, mock `danube_legends`.
- En Overview, expandir una ciudad (detalle abierto), tocar "Excursions": el
  detalle se cierra, el mapa queda visible de fondo sin ruta/city
  cards/controles, y arriba aparecen la hero card + la lista de experiencias.
- Sobre el mapa de fondo, intentar hacer scroll/drag: no debe pasar nada (sin
  pan/zoom).
- Tocar "Overview": el mapa reaparece interactivo, en la misma posición/zoom
  en la que había quedado antes de tocar Excursions (no se reencuadra ni
  parpadea), sin la ciudad expandida (se cerró al cambiar de tab).
- `pnpm lint` y `pnpm test` limpios (169 tests existentes sin cambios).
