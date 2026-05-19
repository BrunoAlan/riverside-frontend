# Agent-Driven UI — Design Spec

**Fecha:** 2026-05-19
**Estado:** Design approved, pendiente de plan de implementación.

## 1. Problema

El backend (LiveKit Agents) ya publica comandos UI en el topic `ui-commands` (ej. `show_discovery_canvas`, `show_itinerary_options`, `soft_redirect`) con payloads ricos como `itinerary_options_preview`. El frontend no los consume — en los logs aparece reiteradamente `ignoring text stream ... no callback attached`.

La selección de vista hoy vive en `components/app/panel-selection-context.tsx` con un `activeId` manual que el usuario cambia mediante chips (`panel-selector.tsx`). El agente no controla nada.

Además, `components/agents-ui/` (y `hooks/agents-ui/`) contiene boilerplate del template de LiveKit que en su mayoría está huérfano: sólo 3 archivos son consumidos por la app.

## 2. Objetivo

Diseñar un sistema en donde:

1. El agente decide qué vista se renderiza y con qué datos, vía comandos sobre el topic `ui-commands`.
2. El frontend valide esos comandos con un schema tipado y reaccione sin acoplamiento por archivo.
3. En desarrollo se pueda forzar cualquier vista con un payload de mock, sin necesidad de correr el agente.
4. Comandos desconocidos o malformados no rompan la sesión.

## 3. Decisiones de diseño

- **Mapping agente↔UI**: View + payload (no 1:1 estricto, no compose multi-region).
- **Dev controls**: Dev panel flotante en `NODE_ENV !== 'production'`.
- **Selector manual**: Eliminado del UI prod.
- **Historial**: Solo estado actual (último comando gana).
- **Tipado**: Discriminated union con Zod, validación en el borde.
- **Comandos desconocidos**: Fallback view + warning log; sesión no se rompe.

## 4. Arquitectura

Tres capas comunicadas por interfaces explícitas:

```
┌─ Transport (lib/agent-ui/transport.ts) ─────────────────┐
│  Suscribe text stream "ui-commands"                     │
│  Parsea con Zod → UiCommand | error                     │
└────────────────────────┬────────────────────────────────┘
                         │  applyCommand(cmd)
                         ▼
┌─ State (lib/agent-ui/ui-view-store.ts) ─────────────────┐
│  Zustand store: { view, hint, source, lastError }       │
└────────────────────────┬────────────────────────────────┘
                         │  useUiView() / useUiHint()
                         ▼
┌─ Render (components/app/agent-ui/*) ────────────────────┐
│  ContentView lee view, busca en VIEW_REGISTRY           │
│  Renderiza <Component view={view} /> + <HintOverlay />  │
└──────────────────────────────────────────────────────▲──┘
                                                       │
            Dev panel (NODE_ENV !== 'production') ─────┘
            setViewFromDev(mockView)
```

## 5. Contrato de comandos

Definido en `lib/agent-ui/commands.ts`. Discriminated union por `type`:

```ts
const Base = z.object({
  correlation_id: z.string(),
  session_id: z.string().optional(),
});

const ShowDiscoveryCanvas = Base.extend({
  type: z.literal('show_discovery_canvas'),
  payload: z.object({}).optional(),
});

const SoftRedirect = Base.extend({
  type: z.literal('soft_redirect'),
  payload: z.object({
    reason_code: z.string(),
    missing: z.array(z.string()).optional(),
  }),
});

const ItineraryOption = z.object({
  id: z.string(),
  name: z.string(),
  embarkation_port: z.string(),
  disembarkation_port: z.string(),
  match_score: z.number(),
});

const ShowItineraryOptions = Base.extend({
  type: z.literal('show_itinerary_options'),
  payload: z.object({ options: z.array(ItineraryOption).min(1) }),
});

export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
]);
export type UiCommand = z.infer<typeof UiCommand>;
```

### Comando vs View vs Hint

No todos los comandos cambian la pantalla. `soft_redirect` decora la actual sin reemplazarla. Por eso modelamos dos slots separados:

```ts
type UiView =
  | { type: 'discovery_canvas' }
  | { type: 'itinerary_options'; options: ItineraryOption[] };

type UiHint =
  | { type: 'soft_redirect'; reasonCode: string; missing?: string[] };
```

### Extender el contrato

Agregar un comando nuevo = 3 cambios en archivos vecinos: schema en `commands.ts`, branch en el reducer del store, entrada en `VIEW_REGISTRY` (si introduce view nueva). Nada más toca.

## 6. State layer

`lib/agent-ui/ui-view-store.ts` (Zustand):

```ts
type Source = 'initial' | 'agent' | 'dev';

interface UiViewState {
  view: UiView;                      // default: { type: 'discovery_canvas' }
  hint: UiHint | null;
  source: Source;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
}
```

### Reglas del reducer

| Comando | `view` | `hint` |
|---|---|---|
| `show_discovery_canvas` | `{type:'discovery_canvas'}` | limpia |
| `show_itinerary_options` | `{type:'itinerary_options', options}` | limpia |
| `soft_redirect` | sin cambio | `{type:'soft_redirect', reasonCode, missing}` |

Todo comando válido setea `source='agent'` y actualiza `lastCorrelationId`. `setViewFromDev` setea `source='dev'`. Cualquier escritura de `applyCommand` posterior pisa la del dev — comportamiento esperado para iterar.

### Selectores expuestos

`lib/agent-ui/hooks.ts`:

```ts
export const useUiView = () => useUiViewStore(s => s.view);
export const useUiHint = () => useUiViewStore(s => s.hint);
export const useUiSource = () => useUiViewStore(s => s.source);
```

Los componentes nunca importan Zustand directo; sólo estos hooks.

## 7. Transport layer

`lib/agent-ui/transport.ts` — hook que se monta una vez dentro de `AgentSessionProvider`:

```ts
export function useUiCommandTransport() {
  const { room } = useRoomContext();
  useEffect(() => {
    if (!room) return;
    const handler = async (reader: TextStreamReader) => {
      const raw = await reader.readAll();
      try {
        const parsed = UiCommand.parse(JSON.parse(raw));
        useUiViewStore.getState().applyCommand(parsed);
      } catch (e) {
        useUiViewStore.getState().recordParseError({ message: String(e) });
      }
    };
    room.registerTextStreamHandler('ui-commands', handler);
    return () => room.unregisterTextStreamHandler('ui-commands');
  }, [room]);
}
```

Llamado desde `App` justo después del provider. Resuelve también el warning `ignoring text stream with topic 'ui-commands'` que aparece en los logs.

## 8. Render layer

`components/app/agent-ui/view-registry.ts`:

```ts
export const VIEW_REGISTRY: {
  [K in UiView['type']]: ComponentType<{ view: Extract<UiView, { type: K }> }>;
} = {
  discovery_canvas: DiscoveryCanvasView,
  itinerary_options: ItineraryOptionsView,
};
```

`ContentView` se reduce a:

```tsx
const view = useUiView();
const Component = VIEW_REGISTRY[view.type] ?? FallbackView;
return (
  <>
    <Component view={view as never} />
    <HintOverlay />
  </>
);
```

### Mapping inicial de views existentes

Las views actuales se mueven a `components/app/agent-ui/views/` y se les ajusta la firma para recibir `view` por props.

- `discovery_canvas` → `PanelWindow` (a confirmar en implementación; alternativa: `PanelDream`).
- `itinerary_options` → `CompareItinerary`.
- Futuras (cabinas, mapa) → comandos nuevos cuando el backend los publique.

No se refactorean los internos de los panels en este spec (ver §11).

## 9. Dev panel + mocks

`components/app/agent-ui/dev/dev-panel.tsx` — widget en esquina, sólo `NODE_ENV !== 'production'`:

- Lista las views de `VIEW_REGISTRY`.
- Para cada view, dropdown de mocks definidos en `mocks.ts` (un mock realista por view, copiado de los payloads que el backend ya genera).
- Botón "Apply" → `setViewFromDev(mock)`.
- Muestra `source` actual y `lastError` (si existe).
- UI mínima, sin shadcn ni animaciones; es herramienta interna.

Montaje en `app.tsx`:

```tsx
{process.env.NODE_ENV !== 'production' && <DevPanel />}
```

Tree-shaking elimina el panel y sus mocks de los bundles de prod.

## 10. Cleanup previo

Antes de introducir la nueva infraestructura, eliminar boilerplate huérfano:

**Eliminar (sin consumidores externos):**
- `components/agents-ui/agent-audio-visualizer-{aura,bar,grid,radial,wave}.tsx`
- `components/agents-ui/agent-control-bar.tsx`
- `components/agents-ui/agent-track-control.tsx`
- `components/agents-ui/agent-track-toggle.tsx`
- `components/agents-ui/agent-disconnect-button.tsx`
- `components/agents-ui/agent-chat-transcript.tsx`
- `components/agents-ui/react-shader-toy.tsx`
- `components/agents-ui/blocks/` (entera)
- `hooks/agents-ui/` (entera)

**Mover a `components/livekit/`:**
- `agent-session-provider.tsx`
- `start-audio-button.tsx`
- `agent-chat-indicator.tsx`

**Eliminar al introducir el nuevo sistema:**
- `components/app/panel-selection-context.tsx`
- `components/app/panel-selector.tsx`
- `components/app/content-panels/registry.ts`

## 11. Testing

| Capa | Test |
|---|---|
| `commands.ts` (Zod) | parse de payloads válidos/inválidos por cada tipo de comando |
| `ui-view-store.ts` | despachar cada comando y assert sobre `view/hint/source/lastError` |
| `transport.ts` | mock `room.registerTextStreamHandler`, simular reader, verificar `applyCommand` vs `recordParseError` |
| `view-registry.ts` | render con cada tipo de view; fallback con tipo inválido |

Sin tests de integración con LiveKit real. Vitest ya está configurado en el proyecto.

## 12. Out of scope (follow-ups explícitos)

- **Refactor de `content-panels/`**: separar building blocks (cards, canvas, layers) de screens compuestas. Tiene su propio diseño aparte. En este spec los panels se mueven a `agent-ui/views/` y se ajustan firmas, pero los internos no se tocan.
- **Deep-linking**: codificar view + payload en URL (sincronizar store ↔ router).
- **Historial / back**: stack navegable de views.
- **Animaciones**: transiciones entre views.
- **Override de usuario**: permitir al usuario "tomar control" del agente y luego devolverlo.

## 13. Dependencias nuevas

- `zod` (validación de comandos).
- `zustand` (state store).

Ambas son livianas (~12 kB y ~3 kB minified gz) y estándar de la industria.

## 14. Estructura final de archivos (resumen)

```
lib/agent-ui/
  commands.ts            # Zod schemas + tipos
  ui-view-store.ts       # Zustand store
  hooks.ts               # selectores
  transport.ts           # useUiCommandTransport()

components/livekit/
  agent-session-provider.tsx
  start-audio-button.tsx
  agent-chat-indicator.tsx

components/app/agent-ui/
  content-view.tsx       # (movido y simplificado)
  view-registry.ts
  fallback-view.tsx
  hint-overlay.tsx
  views/
    discovery-canvas-view.tsx
    itinerary-options-view.tsx
  dev/
    dev-panel.tsx
    mocks.ts
```
