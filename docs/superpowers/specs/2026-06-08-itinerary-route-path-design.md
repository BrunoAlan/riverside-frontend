# Recorrido del barco en el itinerario — diseño

**Fecha:** 2026-06-08
**Vista:** `itinerary` (panel de mapa)
**Estado:** Aprobado, pendiente de plan de implementación

## Objetivo

Dibujar el viaje del barco sobre el mapa MapLibre del itinerario como una
secuencia de **arcos curvos en orden de día**, con **flechas de dirección**, de
forma **estática**. El caso clave: un barco puede pasar **varias veces por la
misma ciudad** (crucero de ida y vuelta por el Danubio); cada revisita debe verse
como un arco propio, no perderse.

Hoy el mapa solo muestra marcadores-tarjeta por ciudad (`city-card-layer.tsx`);
no hay ninguna línea.

## Decisiones tomadas (brainstorming)

| Decisión | Elección |
| --- | --- |
| Cómo se representa la revisita | **Arcos por día** — las vueltas se ven (cada regreso es su propio arco) |
| Dirección / orden | **Arcos + flechas** de dirección (sin números: los días ya están en las tarjetas) |
| Animación | **Estática** |
| Alcance | **Solo la vista `itinerary`** (no `compare_itinerary`) |

## Alcance

En alcance:

- Reconstruir el orden del recorrido a partir de los `days` de cada ciudad.
- Una capa de líneas (arcos) + una capa de flechas sobre el mapa existente.
- Manejo correcto de revisitas y de dos ciudades en el mismo día.
- Tests unitarios de la lógica pura de reconstrucción.

Fuera de alcance:

- `compare_itinerary` (mapas lado a lado) — no se toca.
- Animación / barco que se mueve por la ruta.
- Seguir la geometría real del río (necesitaría datos que hoy no tenemos).
- Cambios de backend / wire (`commands.ts`): se trabaja con el payload actual.
- Interacción (hover/click sobre la línea).

## El dato del que partimos

`ItineraryFull.cities[]` (`lib/agent-ui/commands.ts`). Cada ciudad aparece **una
sola vez**; el orden del recorrido está implícito en un string `days`:

```
Budapest      "Days 1, 2, 6 & 7"   lon 19.0402  lat 47.4979
Bratislava    "Days 3 & 8"         lon 17.1077  lat 48.1486
Tulln         "Days 4 & 9"         lon 16.05    lat 48.33
Wachau Valley "Days 4 & 9"         lon 15.33    lat 48.35
Vienna        "Days 5, 10 & 11"    lon 16.3738  lat 48.2082
Dürnstein     "Day 12"             lon 15.52    lat 48.395
```

No hay campo de orden ni de "legs": se reconstruye.

## Reconstrucción de la ruta — `lib/map/route-path.ts` (nuevo)

Función pura `buildRouteLegs(cities: ItineraryCity[]): RouteLeg[]`.

1. **Parsear días** de cada ciudad con `parseDayNumbers(days) → number[]`
   (nuevo helper en `parse-city-days.ts`; `parseCityDays` pasa a reusarlo).
2. **Expandir** a ocurrencias `{ day, cityIndex, city }`, una por día presente.
   - Si una ciudad no tiene números de día, se le asigna `day = cityIndex` como
     respaldo, para que igual ordene por su posición en el array.
3. **Ordenar** por `day` ascendente; **desempate por `cityIndex`** (el orden de
   `cities[]` ya viene río arriba → resuelve Tulln/Wachau, ambas "Days 4 & 9").
4. **Colapsar** ocurrencias consecutivas de la misma ciudad (Budapest días 1 y 2
   = un nodo, sin bucle sobre sí misma).
5. **Armar tramos**: pares consecutivos `(visitaᵢ, visitaᵢ₊₁)`.

Sobre el mock `danubeLegends` la secuencia colapsada queda:

```
Bud → Bra → Tul → Wac → Vie → Bud → Bra → Tul → Wac → Vie → Dür
```

10 tramos. `Vie → Bud` (día 5→6) es la vuelta grande, bien visible. Los tramos
repetidos (`Bud→Bra`, `Bra→Tul`, `Tul→Wac`, `Wac→Vie`) aparecen dos veces.

```ts
type RouteLeg = {
  from: [number, number]; // [lon, lat]
  to: [number, number];
  fromId: string;
  toId: string;
  repeatIndex: number; // 0 = 1ª vez que se recorre ese corredor, 1 = 2ª, …
};
```

### Corredores repetidos (la clave de que la revisita se vea)

Para que dos pasadas por el mismo corredor no queden una encima de la otra, cada
tramo lleva un `repeatIndex`. Se cuenta por **corredor no-dirigido** (par de IDs
ordenado, así `Bud→Bra` y `Bra→Bud` comparten cuenta):

```
key = [fromId, toId].sort().join('—')
repeatIndex = vecesVistas.get(key) ?? 0   // luego se incrementa
```

## Geometría del arco

Helper `legToFeature(leg): GeoJSON.Feature<LineString>`:

- **Arco** = Bézier cuadrático de `from` a `to`. Punto de control = el punto
  medio del segmento, desplazado **perpendicular** a la cuerda.
- **Magnitud y lado** del desplazamiento desde `repeatIndex`:
  - `lado = repeatIndex par ? +1 : −1`
  - `magnitud = base · (⌊repeatIndex/2⌋ + 1)`, con `base ≈ 18%` del largo del
    tramo, acotado a un mínimo/máximo (tramos cortos igual curvan; el tramo largo
    `Vie→Bud` no se dispara).
  - Así un tramo único (`repeatIndex 0`) ya tiene una curva suave; las pasadas
    repetidas se abren en abanico hacia lados opuestos.
- Se muestrea el Bézier en ~28 puntos → `LineString`. Distancias chicas (región
  del Danubio) → aritmética plana en lon/lat, sin great-circle ni dependencias.
- **Orden de vértices `from → to`**: MapLibre orienta los símbolos de línea según
  ese orden, así la flecha apunta en el sentido de avance.

`routeFeatureCollection(cities)` arma el `FeatureCollection` (un `Feature` por
tramo) listo para el source.

## Dibujo en MapLibre — `components/panels/map/route-layer.tsx` (nuevo)

Espeja `CityCardLayer`: `'use client'`, recibe `{ map, cities }`, maneja todo de
forma imperativa en un `useEffect` keyed en `[map, cities]`, devuelve `null`.
(Cuando `map-canvas` entrega un `map` no-nulo el estilo ya está cargado —
`setMap` corre dentro de `map.on('load')` —, así que se puede `addSource`/
`addLayer` directo.)

- **Source** `route`: GeoJSON con el `FeatureCollection`. En cambios de `cities`
  se hace `setData`; al desmontar se quitan capas y source.
- **Capa `line`** (`route-line`): color **green-700 `#39473c`**, `line-width`
  ~2.5, `line-cap`/`line-join` `round`, `line-opacity` ~0.7. Se agrega arriba de
  las capas de tiles; el grano (overlay DOM con `mix-blend-multiply`) y los
  marcadores quedan por encima — coherente con el look pergamino.
- **Capa `symbol`** (`route-arrows`): `symbol-placement: 'line-center'` → una
  flecha por tramo, en el ápice del arco. Ícono = un triángulo verde chico
  generado en runtime (canvas → `ImageData` → `map.addImage('route-arrow', …)`),
  `icon-rotation-alignment: 'map'`. Con placement de línea el ícono se orienta
  solo según el tramo; `icon-keep-upright` queda en `false` (default) para que no
  invierta el sentido. Sin assets nuevos en `public/`.

### Enganche — `map-canvas.tsx` + `panel-map.tsx` (editar)

`MapCanvas` es compartido con `compare_itinerary`, así que la ruta es **opt-in**
vía un prop nuevo `showRoute` (default off): solo la activa `PanelMap` (vista
`itinerary`). El gate suma `!focusCity` para ocultarla en modo detalle, igual que
las tarjetas. En `compare-itinerary-view.tsx` no se pasa `showRoute` → ruta off.

```tsx
// map-canvas.tsx (prop showRoute?: boolean, default off)
{map && showRoute && !focusCity && <RouteLayer map={map} cities={cityList} />}
// panel-map.tsx pasa `showRoute`; compare-itinerary-view.tsx no lo pasa.
```

## Archivos

| Archivo | Cambio |
| --- | --- |
| `lib/map/route-path.ts` | **Nuevo** — `buildRouteLegs`, `routeFeatureCollection`, Bézier + offset. Puro, sin MapLibre. |
| `lib/map/route-path.test.ts` | **Nuevo** — tests de la reconstrucción. |
| `lib/map/parse-city-days.ts` | **Editar** — agregar `parseDayNumbers(): number[]`; `parseCityDays` lo reusa (refactor mínimo, sin cambiar su salida). |
| `components/panels/map/route-layer.tsx` | **Nuevo** — capa imperativa de ruta sobre el mapa, espeja `CityCardLayer`. |
| `components/panels/map/map-canvas.tsx` | **Editar** — prop `showRoute` (default off) + renderizar `<RouteLayer>` con `map && showRoute && !focusCity`. |
| `components/panels/map/panel-map.tsx` | **Editar** — pasar `showRoute` al `MapCanvas` (activa la ruta solo en la vista `itinerary`). |

## Testing

Por `conventions/testing.md` solo se recolecta `lib/**/*.test.ts`; los
componentes React se verifican en el dev panel. Entonces:

- **`lib/map/route-path.test.ts`** (donde está el riesgo real):
  - Ruta lineal sin repetir → `n−1` tramos, en orden.
  - Revisita (Budapest en días 1-2 y 6-7) → aparece el tramo de vuelta y los
    corredores repetidos reciben `repeatIndex` creciente.
  - Dos ciudades en el mismo día (Tulln/Wachau) → ordenan por `cityIndex`.
  - Días consecutivos misma ciudad → se colapsan (sin auto-bucle).
  - Itinerario de una sola ciudad → sin tramos (FeatureCollection vacío).
- `route-layer.tsx` y los cambios de `map-canvas.tsx`: verificación visual en el
  dev panel (mock `Danube Legends`). Sin tests de browser salvo pedido explícito.
- `pnpm lint` + `pnpm test` en verde antes de cualquier push (regla dura).

## Secuencia de build

1. `parseDayNumbers` en `parse-city-days.ts` (+ reuso en `parseCityDays`) → verif: `pnpm test` sigue verde.
2. `route-path.ts` con la reconstrucción y la geometría → verif: tests nuevos pasan.
3. `route-layer.tsx` (source + capas) → verif: type-checks, renderiza.
4. Enganche en `map-canvas.tsx` → verif: en el dev panel el mock muestra los arcos en orden de día, con la vuelta visible y flechas en el sentido de avance.
5. Modo detalle → verif: al abrir una ciudad la ruta se oculta; al cerrar, vuelve.
6. `pnpm lint` + `pnpm test` → verif: ambos limpios.
