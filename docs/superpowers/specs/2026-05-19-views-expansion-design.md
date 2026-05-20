# Views Expansion — Design Spec

**Fecha:** 2026-05-19
**Estado:** Design approved, pendiente de plan.
**Extiende:** [2026-05-19-agent-driven-ui-design.md](./2026-05-19-agent-driven-ui-design.md)

## 1. Problema

El sistema agent-driven UI inicial soporta dos views (`discovery_canvas`, `itinerary_options`) y un gate manual `started` en `ViewController` para la pantalla de bienvenida. Tenemos building blocks adicionales (`PanelDream`, `PanelMap`, `PanelCabinSelection`, `CompareItinerary`) que no están integrados al store, y la pantalla `start` vive fuera del modelo de views — el dev panel no puede previsualizarla ni hay forma uniforme de navegar entre todas las pantallas.

## 2. Objetivo

1. Modelar las 6 pantallas del producto como views en el store: `start`, `presentation`, `dream_stage`, `itinerary`, `compare_itinerary`, `cabin_selection`.
2. Mover la transición start → presentation al store (acoplada al click del botón + `session.start()`).
3. Mantener los nombres de comando que emite el backend hoy (`show_discovery_canvas`, `show_itinerary_options`) y mapearlos a los nuevos nombres de view internamente.
4. Permitir previsualizar cualquier view (incluida `start`) desde el dev panel sin iniciar sesión LiveKit.

## 3. Decisiones de diseño

- **`start` como view**: unifica el modelo (todo es view) y habilita preview en dev. La sesión LiveKit no se inicia con `setView`; solo el handler del botón en `WelcomeView` llama a `session.start()`.
- **Renames internos, comandos backend intactos**: `discovery_canvas` → `presentation`, `itinerary_options` → `compare_itinerary` en el front. El backend sigue emitiendo `show_discovery_canvas` / `show_itinerary_options`; el reducer los traduce.
- **Sin comandos nuevos**: `dream_stage`, `itinerary`, `cabin_selection`, `start` solo son alcanzables vía `setViewFromDev` por ahora. Cuando el backend agregue los comandos correspondientes (incluyendo `end_presentation`), se suman al schema y al reducer sin tocar el resto.
- **Source `'user'`**: nueva `UiSource` para el caso del click en el botón de start. Distingue "el usuario inició" de "el agente movió la UI" y "dev forzó la view".
- **Reset button**: el dev panel agrega un botón explícito que despacha `setViewFromDev({ type: 'start' })`.
- **Un mock por view**: simplicidad. Las views sin payload tienen mock trivial.
- **Hints en dev**: out of scope (sigue siendo solo el path `soft_redirect` del agente).

## 4. Contrato de views

```ts
export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage' }
  | { type: 'itinerary' }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection' };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';
```

`INITIAL_VIEW` cambia a `{ type: 'start' }`.

## 5. Mapeo comando → view

| Comando backend | View resultante |
|---|---|
| `show_discovery_canvas` | `{ type: 'presentation' }` |
| `show_itinerary_options` | `{ type: 'compare_itinerary', options }` |
| `soft_redirect` | (no cambia view, setea hint) |

El schema Zod en `commands.ts` no cambia (sigue validando lo que el backend emite). Solo el reducer del store traduce los tipos de comando a los nuevos tipos de view.

## 6. Reducer del store

```ts
applyCommand: (cmd) => set(() => {
  switch (cmd.type) {
    case 'show_discovery_canvas':
      return { view: { type: 'presentation' }, hint: null, source: 'agent', lastCorrelationId: cmd.correlation_id };
    case 'show_itinerary_options':
      return { view: { type: 'compare_itinerary', options: cmd.payload.options }, hint: null, source: 'agent', lastCorrelationId: cmd.correlation_id };
    case 'soft_redirect':
      return { hint: { type: 'soft_redirect', reasonCode: cmd.payload.reason_code, missing: cmd.payload.missing }, source: 'agent', lastCorrelationId: cmd.correlation_id };
  }
}),
```

Se agrega `setViewFromUser(view)` para el click del WelcomeView:

```ts
setViewFromUser: (view) => set({ view, hint: null, source: 'user', lastCorrelationId: null }),
```

`setViewFromDev` sigue igual.

## 7. ViewController + WelcomeView

`ViewController` deja de tener `started` local. Mantiene `WindowBackground` por fuera de `AnimatePresence` (evita reload del video al transicionar start → presentation), con `isPlaying` derivado del view actual:

```tsx
export function ViewController() {
  const view = useUiView();
  const isPresentationActive = view.type === 'presentation';
  const showBackground = view.type === 'start' || view.type === 'presentation';
  return (
    <>
      {showBackground && <WindowBackground isPlaying={isPresentationActive} />}
      <AnimatePresence mode="wait">
        <MotionContentView key={view.type} {...VIEW_MOTION_PROPS} />
      </AnimatePresence>
    </>
  );
}
```

Consecuencia: `PresentationView` ya no renderiza `<PanelWindow />` ni `<WindowBackground />` directamente — solo necesita estar presente como entrada del registry (placeholder vacío) porque `WindowBackground` lo aporta `ViewController`. Esto preserva el crossfade actual entre welcome y video playing sin reload.

`appConfig` deja de ser necesario en `ViewController` — el `startButtonText` se pasa al `StartView` vía registry-friendly mechanism: la entrada `start` del registry es un componente que internamente lee `appConfig` desde un context simple (o se hardcodea el texto). Decisión: **leer `appConfig.startButtonText` desde un contexto liviano** ya disponible (`AppConfigContext`), o si no existe, crear uno mínimo.

`WelcomeView` recibe un nuevo prop `onStart: () => void` que dispara `setViewFromUser({ type: 'presentation' })` + `session.start()`. La lógica vive en un wrapper `StartView` registrado en `VIEW_REGISTRY`:

```tsx
function StartView() {
  const { start } = useSessionContext();
  const setView = useSetViewFromUser();
  const handleStart = () => {
    setView({ type: 'presentation' });
    start();
  };
  return <WelcomeView startButtonText={...} onStartCall={handleStart} />;
}
```

Para evitar prop drilling de `appConfig.startButtonText`, lo más liviano es agregar un `AppConfigContext` que `App` proveea. Es un cambio chico y contenido.

## 8. View registry

```ts
export const VIEW_REGISTRY: ViewRegistry = {
  start: StartView,
  presentation: PresentationView,        // renders PanelWindow
  dream_stage: DreamStageView,           // renders PanelDream
  itinerary: ItineraryView,              // renders PanelMap
  compare_itinerary: CompareItineraryView,  // renders existing CompareItinerary
  cabin_selection: CabinSelectionView,   // renders PanelCabinSelection
};
```

Cada wrapper view en `components/app/agent-ui/views/`:

- `start-view.tsx`: contiene `StartView` descripto arriba.
- `presentation-view.tsx`: reemplaza `discovery-canvas-view.tsx`. Renderiza un fragmento vacío (`<></>`) — el video es aportado por `ViewController` para preservar continuidad visual.
- `dream-stage-view.tsx`: `<PanelDream />`.
- `itinerary-view.tsx`: `<PanelMap />`.
- `compare-itinerary-view.tsx`: reemplaza `itinerary-options-view.tsx`. Recibe `view: { type: 'compare_itinerary'; options }`, usa el componente `CompareItinerary` existente (con la misma lógica de resolución por id que tiene hoy `itinerary-options-view.tsx`).
- `cabin-selection-view.tsx`: `<PanelCabinSelection />`.

## 9. Dev panel

- Botón **Reset** → `setViewFromDev({ type: 'start' })`.
- Lista todos los `view.type` del registry (6 entradas).
- Un mock por view en `VIEW_MOCKS`:

```ts
export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  start: [{ id: 'default', label: 'Default', view: { type: 'start' } }],
  presentation: [{ id: 'default', label: 'Video playing', view: { type: 'presentation' } }],
  dream_stage: [{ id: 'default', label: 'Dream collage', view: { type: 'dream_stage' } }],
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary' } }],
  compare_itinerary: [{ id: 'two_danube_options', label: 'Two Danube options', view: { type: 'compare_itinerary', options: [...] } }],
  cabin_selection: [{ id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } }],
};
```

- `source: 'user'` se muestra en el indicador del panel junto a los existentes.

## 10. App layout

`ViewController` ya no recibe `appConfig` como prop (lo lee del context). `App` provee `AppConfigContext` con el config completo. Eso es lo único nuevo a nivel layout.

## 11. Testing

| Capa | Test |
|---|---|
| `ui-view-types.ts` | (compile-time) — los tests del store cubren el shape |
| `ui-view-store.ts` | dispatch de cada comando produce la view nueva nombrada (`presentation`, `compare_itinerary`); `setViewFromUser` setea source='user'; default view = `start` |
| `view-registry.ts` | (compile-time) — typecheck cubre las 6 entradas |
| Mocks | tipos verificados por TS al usar `Record<UiView['type'], ...>` |

Sin tests de render (mantenemos la restricción Vitest a `lib/`). Verificación manual del dev panel queda en checklist final.

## 12. Cleanup

- Eliminar `components/app/agent-ui/views/discovery-canvas-view.tsx`
- Eliminar `components/app/agent-ui/views/itinerary-options-view.tsx`
- `ViewController` deja de aceptar prop `appConfig` → ajustar caller en `app.tsx`

## 13. Out of scope

- Comandos backend nuevos (`show_dream_stage`, `show_itinerary`, `show_cabin_selection`, `end_presentation`) — se sumarán cuando el backend los emita.
- Hints en dev panel.
- Múltiples mocks por view.
- Animaciones distintas por view.

## 14. Estructura final de archivos (resumen)

```
lib/agent-ui/
  commands.ts            # sin cambios
  ui-view-types.ts       # 6 views + source 'user'
  ui-view-store.ts       # reducer renombra; setViewFromUser nuevo
  hooks.ts               # + useSetViewFromUser
  transport.ts           # sin cambios

components/app/
  app-config-context.tsx # nuevo (provider + hook)
  view-controller.tsx    # sin started; appConfig del context
  agent-ui/
    view-registry.ts     # 6 entradas
    content-view.tsx     # sin cambios
    fallback-view.tsx    # sin cambios
    hint-overlay.tsx     # sin cambios
    views/
      start-view.tsx
      presentation-view.tsx
      dream-stage-view.tsx
      itinerary-view.tsx
      compare-itinerary-view.tsx
      cabin-selection-view.tsx
    dev/
      dev-panel.tsx      # + botón Reset
      mocks.ts           # 6 mocks
```
