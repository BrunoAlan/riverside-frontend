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

`ExcursionsPanel()` (sin props). Reemplaza el `absolute inset-0` que hoy ocupa
el mapa.

- Grid de 3-4 cards mockeadas con datos hardcodeados en el archivo (constante
  local, sin store ni fetch), reusando las ciudades reales del itinerario
  mock (Budapest, Bratislava, Vienna) para mantener coherencia con
  `danubeLegends` en `lib/dev/mocks.ts`.
- Estilo de card igual a `city-detail-card.tsx`: `bg-beige-50
  border-beige-400/50 rounded-2xl p-3`.
- Cada card: ícono `lucide-react` (`Compass` o `MapPin`) como placeholder
  visual (no hay imágenes reales todavía), nombre de la excursión, y una
  descripción corta de una línea.

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
      <ExcursionsPanel />
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

- `pnpm lint` limpio.
- `pnpm test` verde, incluyendo tests nuevos:
  - `itinerary-tabs.test.tsx`: renderiza las dos pills, aplica la clase de
    seleccionado a la que corresponde según `value`, dispara `onChange` con el
    valor correcto al clickear la pill no activa.
  - `itinerary-panel.test.tsx`: por defecto renderiza `PanelMap` (mock del
    módulo, ya que depende de MapLibre) y no `ExcursionsPanel`; al clickear la
    pill "Excursions" desmonta `PanelMap` y monta `ExcursionsPanel`; click en
    "Overview" vuelve al mapa.
- Manual: `pnpm dev` → vista de itinerario → tapear "Excursions" oculta el
  mapa y muestra las cards mockeadas; tapear "Overview" lo restaura.
