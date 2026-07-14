# Tabs de sección sobre el itinerario (Overview / Excursions)

**Fecha:** 2026-07-13
**Branch:** `feat/itinerary-tabs` (a crear)

## Problema

La vista de itinerario (`itinerary-view.tsx` → `PanelMap`) hoy solo muestra el
mapa full-bleed. El diseño pide agregar, arriba a la izquierda, una barra de
pills tipo segmented control ("Overview", "Food & Drink", "Excursions") que
permita tapear entre secciones. Por ahora solo se necesitan dos secciones
funcionales:

- **Overview**: el itinerario actual (mapa).
- **Excursions**: contenido mockeado que **reemplaza completamente** el mapa
  (no es un overlay).

"Food & Drink" no se construye todavía (ni la pill ni el contenido).

## Objetivo

Agregar la barra de pills y el cambio de contenido Overview ↔ Excursions,
reusando el máximo de componentes existentes y seleccionando siempre a través
de estado local (no agent-driven todavía).

## Decisión de enfoque

El estado de la tab activa queda como `useState` local a un nuevo panel
contenedor, **no** en `UiView`. Razón: el pedido explícito es "por ahora
quiero la parte visual" — llevar esto a `UiView.itinerary.activeTab` +
`UiCommand` implicaría tocar `ui-view-types.ts`, `ui-view-store.ts`,
`commands.ts` y los mocks de `lib/dev/mocks.ts` para una capacidad que no se
va a usar todavía (YAGNI). Si el agente necesita controlar la tab a futuro, se
migra el `useState` a un campo de `UiView` sin cambiar la forma de los
componentes de presentación (`ItineraryTabs`, `ExcursionsPanel`).

Para la barra de pills se reusa el primitivo shadcn `Tabs`/`TabsList`/
`TabsTrigger` (`components/ui/tabs.tsx`) restyleado vía `className`, en vez de
construir un segmented-control desde cero: ya trae accesibilidad (ARIA,
navegación por teclado) y es el mecanismo de reuso que marcan las convenciones
(no se edita `components/ui/`, se compone desde afuera con `cn()`).

## Cambios

### 1. `components/panels/itinerary/itinerary-tabs.tsx` (nuevo)

`ItineraryTabs({ value, onChange }: { value: 'overview' | 'excursions'; onChange: (value: 'overview' | 'excursions') => void })`.

- Envuelve `Tabs`/`TabsList`/`TabsTrigger` de `components/ui/tabs.tsx`.
- `TabsList`: `bg-white/95 rounded-full p-1 shadow-sm` (contenedor "pill de
  pills" de la imagen).
- `TabsTrigger`: `rounded-full px-5 py-2 text-sm` con estado seleccionado
  `bg-primary text-primary-foreground` (verde sage) y no seleccionado
  `bg-beige-200 text-primary` (tan), sin bordes — mismo vocabulario de tokens
  que `days-badge.tsx` / `city-card.tsx` (nunca hex literal).
- Puramente presentacional: no conoce `PanelMap` ni `ExcursionsPanel`, solo
  emite `onChange`.

### 2. `components/panels/itinerary/excursions-panel.tsx` (nuevo)

`ExcursionsPanel({ itinerary }: { itinerary: ItineraryFull | undefined })`.
Reemplaza el `absolute inset-0` que hoy ocupa el mapa. Layout: mismo wrapper
centrado que ya usa `panel-map.tsx` para el overlay de detalle
(`absolute inset-0 flex items-center justify-center gap-4 p-6`), con dos
elementos lado a lado:

**a) Card "hero" del crucero (helper privado `CruiseHeroCard`, no exportado —
mismo patrón que `ExperienceGallery` dentro de `experience-card.tsx`):**

- Todo hardcodeado como mock puro (no depende de `ItineraryFull`, que hoy no
  tiene imagen ni descripción propias): imagen `/hero-image.jpg` (la misma que
  ya usa `components/home/hero.tsx`, temática crucero genérica), un título y
  descripción cortos fijos, más dos filas de datos fijos
  ("Time spent" → "Mostly on board", "Perfect for" → "Romantic getaways").
- Mismo estilo de card que `city-detail-card.tsx`: `bg-beige-50
  border-beige-400/50 rounded-2xl p-3`, imagen `fill` en un contenedor
  `relative h-[200px] w-full`.
- Sin botón de cerrar — la única forma de salir de Excursions es tocar la pill
  "Overview".

**b) Lista de experiencias — reusa `CityExperiencesPanel` sin modificarlo:**

- `experiences`: `(itinerary?.cities ?? []).flatMap((c) => c.experiences ?? [])`
  — agrega las experiencias reales de **todas** las ciudades del itinerario
  (no una sola ciudad), dato real del mock.
- `dayOptions`: días únicos de todas las ciudades —
  `Array.from(new Set((itinerary?.cities ?? []).flatMap((c) => parseCityDays(c.days))))`.
- `addedExperiences`: `useAddedExperiences()` (mismo hook que usa `PanelMap`,
  para reflejar experiencias ya agregadas desde el mapa).
- `detailExperienceId`: `null` (no hay deep-link a una experiencia puntual).
- `onExplore` / `onConfirm`: no-ops (`() => {}`). Abrir/cerrar cada
  `ExperienceCard` sigue funcionando (es estado interno del componente), pero
  no se dispara ningún intent real al agente — consistente con que esta
  sección es mock por ahora.

### 3. `components/panels/itinerary/itinerary-panel.tsx` (nuevo)

`ItineraryPanel({ view }: { view: Extract<UiView, { type: 'itinerary' }> })`.

- `'use client'`, `useState<'overview' | 'excursions'>('overview')`.
- Estructura:
  ```tsx
  <div className="absolute inset-0">
    <div className="absolute top-6 left-6 z-20">
      <ItineraryTabs value={activeTab} onChange={setActiveTab} />
    </div>
    {activeTab === 'overview' ? (
      <PanelMap view={view} />
    ) : (
      <ExcursionsPanel itinerary={view.itinerary} />
    )}
  </div>
  ```
- `z-20` para quedar por encima del overlay de `CityDetailCard`/
  `CityExperiencesPanel` que `PanelMap` ya posiciona con `z-10`.

### 4. `components/agent-ui/views/itinerary-view.tsx` (modificado)

Pasa de renderizar `<PanelMap view={view} />` a `<ItineraryPanel view={view} />`.
Sigue siendo un wrapper delgado (mismo prop `view`, mismo patrón que hoy).

## Fuera de alcance

- Pill "Food & Drink" (ni visual ni funcional).
- Control remoto de la tab activa por el agente (`UiCommand`, campo en
  `UiView`, mocks en `VIEW_MOCKS.itinerary`).
- Datos reales de excursiones (fetch, store, integración con backend).
- Animación de transición entre Overview y Excursions (cambio instantáneo,
  como cualquier otro condicional de React).

## Verificación

Según `conventions/testing.md`, los componentes React no llevan test unitario
en este repo (`vitest.config.ts` solo colecta `lib/**/*.test.ts`; la
verificación de UI es visual vía el dev panel). Este cambio es puramente de
componentes (`ItineraryTabs`, `ExcursionsPanel`, `ItineraryPanel`,
`ItineraryView`), así que no se agregan archivos `.test.ts(x)` nuevos.

- `pnpm lint` limpio.
- `pnpm test` verde (suite existente, sin cambios esperados).
- Manual vía dev panel (`pnpm dev` → botón "dev" → view `itinerary`, mock
  `danube_legends`):
  - Se ve la barra de pills arriba a la izquierda, "Overview" seleccionada
    (verde sage) y "Excursions" sin seleccionar (tan).
  - Tapear "Excursions" oculta el mapa por completo y muestra la card hero +
    la lista de experiencias de Budapest, Bratislava y Vienna juntas.
  - Cada experiencia se puede expandir/contraer (chevron) y el selector de
    día muestra opciones; el botón "Confirm" no dispara ningún intent (se
    puede confirmar visualmente en devtools que no hay llamada de red nueva).
  - Tapear "Overview" restaura el mapa exactamente como estaba (con su estado
    de ciudad expandida si había una).
