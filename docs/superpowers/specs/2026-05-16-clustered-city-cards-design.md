# Clustered City Cards — Design

**Fecha:** 2026-05-16
**Branch:** `feat/clustered-city-cards`

## Problema

Las `CityCard` se renderizan hoy como markers independientes de MapLibre (uno por
ciudad en `map-canvas.tsx`). Cuando dos o más ciudades quedan cerca en pantalla, las
cards se superponen de forma no controlada: el orden de `z-index` es arbitrario y el
solape depende del zoom y la geografía. Queremos que, al acercarse, las cards se
apilen en una **cascada diagonal limpia y consistente**.

## Enfoque elegido

**Overlay React único.** Se reemplazan los N markers de MapLibre por una sola capa
overlay absolutamente posicionada sobre el canvas del mapa. En cada movimiento del
mapa se proyectan las coordenadas a píxeles, se agrupan las ciudades cercanas y se
renderizan las cards con offset y `z-index` calculados.

Alternativas descartadas:
- **Markers de MapLibre + nudge por CSS:** pelea contra el posicionamiento que la
  librería aplica a cada marker; el `z-index` entre markers no es fiable.
- **Clustering nativo de MapLibre (GeoJSON):** solo aplica a capas de símbolos /
  círculos, no a HTML arbitrario como estas cards.

## Arquitectura

`map-canvas.tsx` deja de crear un marker por ciudad. En su lugar crea **un único
overlay** (`<div>` absoluto sobre el canvas) con un solo React root que monta
`<CityCardLayer>`.

### Componentes

- **`CityCardLayer`** (nuevo — `components/app/content-panels/city-card-layer.tsx`):
  recibe el array de `cities` y la instancia del `map`. Se suscribe al evento `move`
  del mapa con `useEffect` y mantiene en estado las posiciones proyectadas
  (`map.project([lon, lat])`). En cada render: proyecta → agrupa → posiciona.
- **`clusterCities`** (helper puro — `lib/map/cluster-cities.ts`): dado
  `[{ city, x, y }]` y un `threshold` en píxeles, agrupa por proximidad de pantalla
  (unión de elementos cercanos). Función pura y testeable de forma aislada.
- **`CityCard`** (existente): se le agrega una prop `interactive` (default `true`).
  Cuando es `false`, se desactivan `pointer-events` y el botón de expandir.

### Cascada

Dentro de un cluster las cards se ordenan por latitud (norte → sur). Cada card
siguiente se desplaza con un offset diagonal fijo (`~+30px` en x, `~+58px` en y) y
`z-index` creciente. Así la card del sur queda **al frente y abajo**, y las del norte
asoman por arriba. La card del frente queda anclada a su coordenada real; las de
atrás la trailing hacia arriba-izquierda.

### Interacción

Solo la card del frente de cada cluster es interactiva (`interactive=true`). Las de
atrás se renderizan con `pointer-events-none` y sin botón de expandir. Las ciudades
que no forman cluster se renderizan normales e interactivas. Al hacer zoom in los
clusters se deshacen automáticamente (es solo recalcular).

## Data flow

```
map "move" / "zoom"
  → setState posiciones proyectadas (map.project)
  → clusterCities(posiciones, threshold)
  → render de cards con offset diagonal + z-index
```

## Testing

- Tests unitarios de `clusterCities`:
  - nada cerca → cada ciudad en su propio grupo
  - dos cerca → un grupo de dos + el resto sueltas
  - cadena de tres (A cerca de B, B cerca de C) → un único grupo de tres
  - dos pares separados → dos grupos de dos
- El render del overlay y la cascada se validan manualmente en el browser.

## Parámetros a ajustar

- `threshold` de clustering: ~120px (las cards miden 220px de ancho).
- Offset diagonal de la cascada: `~30px` x / `~58px` y (a afinar visualmente).
