# Excursions: wire real selection + per-city day scoping

**Fecha:** 2026-07-13
**Branch:** `feat/itinerary-tabs` (continuación del mismo feature)
**Complementa:** [`2026-07-13-itinerary-tabs-design.md`](./2026-07-13-itinerary-tabs-design.md)
(contenido de `ExcursionsPanel`) y
[`2026-07-13-itinerary-tabs-map-background-design.md`](./2026-07-13-itinerary-tabs-map-background-design.md)
(mapa de fondo). Ninguno de los dos se modifica.

## Problema

`ExcursionsPanel` hoy pasa `onExplore={() => {}}` y `onConfirm={() => {}}` a
`CityExperiencesPanel` — no-ops intencionales, decisión tomada cuando esta
vista era "solo visual". Además, `dayOptions` se calcula como la unión
deduplicada de los días de **todas** las ciudades del itinerario
(`cities.flatMap(city => parseCityDays(city.days))`), porque `Experience` no
sabe a qué ciudad pertenece una vez que `ExcursionsPanel` aplana
`cities.flatMap(city => city.experiences)` — la única asociación era
estructural (anidamiento en `city.experiences`) y se pierde en el flatMap. En
`PanelMap`, este problema no existe porque solo se muestra el detalle de una
ciudad a la vez.

## Objetivo

1. Que abrir/confirmar una excursión en Excursions mande el mismo intent real
   que ya manda `PanelMap` para el detalle de ciudad (`explore_experience` /
   `select_experience`), en vez de no hacer nada.
2. Que el selector de día de cada experiencia solo ofrezca los días de la
   ciudad a la que esa experiencia pertenece — no los de todo el itinerario.

## Decisión de enfoque

**Resolver de días por experiencia, no lista plana compartida.** El prop
`dayOptions: string[]` de `CityExperiencesPanel` (compartido por todas las
`ExperienceCard` de la lista) pasa a ser `getDayOptions: (experience:
Experience) => string[]`. `ExperienceCard` no cambia — sigue recibiendo un
`dayOptions: string[]` ya resuelto para su propia fila. Se descartó agrupar
`ExcursionsPanel` por ciudad (una `CityExperiencesPanel` por ciudad, como hace
`PanelMap`) porque cambiaría el layout ya implementado (lista única mezclada)
sin necesidad — el resolver logra lo mismo sin tocar el diseño visual
existente.

**La construcción del mapa experiencia→días es una función pura y
testeable**, no un cálculo inline en el componente. Vive en
`lib/map/build-experience-day-options.ts` junto al resto de utilidades de
mapa (`lib/map/parse-city-days.ts`, `lib/map/cities.ts`), siguiendo
`conventions/testing.md`: solo `lib/**/*.test.ts` corre en la suite
automatizada; los componentes se verifican a mano vía dev panel.

**Los handlers de intent se duplican en `ExcursionsPanel`, no se comparten
con `PanelMap`.** `PanelMap.handleExperienceExplore`/`handleExperienceConfirm`
son ~10 líneas ya en producción y revisadas. Por la convención de "cambios
quirúrgicos" del repo (no tocar código que funciona para generalizarlo),
`ExcursionsPanel` implementa el mismo patrón de forma independiente en vez de
extraer un hook compartido.

## Cambios

### 1. `lib/map/build-experience-day-options.ts` (nuevo)

```ts
import type { Experience, ItineraryCity } from '@/lib/agent-ui/commands';
import { parseCityDays } from '@/lib/map/parse-city-days';

export function buildExperienceDayOptions(cities: ItineraryCity[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const city of cities) {
    const days = parseCityDays(city.days);
    for (const experience of city.experiences ?? []) {
      map.set(experience.id, days);
    }
  }
  return map;
}
```

Nota: si el mismo `experience.id` apareciera en más de una ciudad (no ocurre
en los datos actuales), el último `city` recorrido gana — comportamiento de
`Map.set`, no se agrega manejo especial para un caso que no existe hoy.

**Test** (`lib/map/build-experience-day-options.test.ts`): mapea los días
correctos por experiencia cuando hay varias ciudades; una ciudad sin
`experiences` no rompe nada; una experiencia no incluida en el mapa se
resuelve afuera con `?? []` (se prueba en el sitio de uso, no acá).

### 2. `components/panels/map/city-experiences-panel.tsx` (modificar)

- Prop `dayOptions: string[]` → `getDayOptions: (experience: Experience) =>
  string[]`.
- En el `.map(...)` sobre `experiences`, cada `ExperienceCard` recibe
  `dayOptions={getDayOptions(experience)}` en vez del array compartido.
- `ExperienceCard` no cambia (su prop sigue siendo `dayOptions: string[]`,
  ya resuelto por su padre).

### 3. `components/panels/map/panel-map.tsx` (modificar, mínimo)

- Donde hoy pasa `dayOptions={dayOptions}` a `CityExperiencesPanel`, pasa
  `getDayOptions={() => dayOptions}` — sigue siendo la misma lista de un
  único día calculada hoy (`detailCity ? parseCityDays(detailCity.days) :
  []`), solo envuelta en una función constante para cumplir la nueva firma.
  Nada más cambia en este archivo.

### 4. `components/panels/itinerary/excursions-panel.tsx` (modificar)

- Agrega `useFrontendIntent` (mismo hook que usa `PanelMap`).
- Calcula `const dayOptionsByExperience = buildExperienceDayOptions(cities)`
  (usa el `cities` que ya arma hoy).
- Pasa `getDayOptions={(experience) => dayOptionsByExperience.get(experience.id) ?? []}`
  a `CityExperiencesPanel` en vez de `dayOptions={dayOptions}` (el cálculo
  actual de `dayOptions` deduplicado se elimina — deja de usarse).
- Agrega, con el mismo patrón exacto que `PanelMap`:
  ```ts
  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  const handleExperienceConfirm = useCallback(
    (experience: Experience, day: string) => {
      void sendIntent('select_experience', {
        entities: { experience_id: experience.id, day },
        userMessage: `User added ${experience.name} for ${day}`,
      });
    },
    [sendIntent]
  );
  ```
- Pasa `onExplore={handleExperienceExplore}` y `onConfirm={handleExperienceConfirm}`
  en vez de los no-ops actuales.

## Fuera de alcance

- El botón "Reject" de `ExperienceCard` sigue sin intent definido (ya lo
  estaba antes de este cambio, no forma parte del pedido).
- No se persiste ni verifica del lado del backend si `select_experience`
  efectivamente reserva/confirma algo — este cambio solo asegura que el
  intent correcto sale del frontend con el payload correcto.
- No se toca `PanelMap` más allá del cambio de firma de una línea
  (`dayOptions` → `getDayOptions`).
- No se agrupa `ExcursionsPanel` por ciudad ni cambia su layout visual.
- El caso de una misma experiencia repetida en dos ciudades del mismo
  itinerario no se maneja explícitamente (no ocurre con los datos actuales).

## Verificación

Según `conventions/testing.md`:

- **Automatizado:** `lib/map/build-experience-day-options.test.ts` (nuevo,
  Vitest) + `pnpm test` (suite completa) + `pnpm lint` + `tsc --noEmit`.
- **Manual (dev panel):** `pnpm dev` → dev panel → view `itinerary`, mock con
  varias ciudades con experiencias (`danube_legends`). En Excursions, abrir
  una experiencia de la Ciudad A: el selector de día solo muestra los días de
  la Ciudad A. Confirmar un día: la card pasa a estado "Added" (ya usa
  `useAddedExperiences`, dato real). Verificar en Network/consola (o logs del
  hook `useFrontendIntent`) que se envían `explore_experience` y
  `select_experience` con el `experience_id`/`day` correctos. Repetir con una
  experiencia de otra ciudad del mismo itinerario y confirmar que sus
  opciones de día son las de *su* ciudad, no las de la primera.
