# Route follows the Danube — design

## Problem

The itinerary route is drawn as a straight `LineString` connecting the cities,
sorted west-to-east by longitude (`lib/map/route-path.ts`). The cities of this
itinerary (Wachau Valley, Vienna, Bratislava) all sit on the Danube, so a
straight stroke misrepresents the actual voyage. We want the route line to
follow the river's course instead.

## Scope

Fixed itinerary: the Danube, with the current cities. We embed the real river
geometry as static data — no runtime network calls, no new dependencies.

## Approach

Replace the straight city-to-city interpolation with a pre-extracted polyline of
the Danube's course. Keep the public surface identical so nothing downstream
changes.

### Components

1. **`lib/map/danube-path.ts` (new)** — exports
   `DANUBE_COORDINATES: [number, number][]`, the Danube's course over the
   Wachau→Bratislava reach, ordered west-to-east. Sourced once from the
   OpenStreetMap Danube waterway via Overpass, simplified to a few dozen points,
   and committed as a static literal. A header comment records the Overpass query
   used so the data is reproducible.

2. **`lib/map/route-path.ts` (changed)** — `routeFeatureCollection(cities)` no
   longer connects city vertices. Instead it clips `DANUBE_COORDINATES` to the
   itinerary's extent: take the min/max longitude across `cities` and return the
   sub-stretch of the river within that range (with the endpoints anchored to the
   westernmost/easternmost city so the line reaches each one). Returns the same
   `RouteFeatureCollection` type as today.

3. **`components/panels/map/route-layer.tsx` (unchanged)** — consumes the same
   type; same source/layer/paint.

### Degenerate case

Fewer than 2 cities → empty FeatureCollection (unchanged from today).

### Data flow

`cities` → `route-path` clips `DANUBE_COORDINATES` to the longitude range and
anchors endpoints → `RouteFeatureCollection` → `RouteLayer.setData` → MapLibre
`line` layer (unchanged paint/style).

### Endpoint anchoring

Cities don't fall exactly on river vertices. The clipped sub-stretch is prefixed
with the westernmost city's coordinate and suffixed with the easternmost city's,
so the visible line starts and ends at the cities while bending along the river
in between. Final tuning decided against the real data.

## Testing

`lib/map/route-path.test.ts`:

- <2 cities → empty collection.
- The 3 itinerary cities → a single `LineString` with many points (follows the
  river, not 3 vertices).
- All returned coordinates fall within the expected longitude range.

## Out of scope

- Dynamic rivers / arbitrary itineraries.
- Any change to the line's paint, color, width, or the layer lifecycle.
