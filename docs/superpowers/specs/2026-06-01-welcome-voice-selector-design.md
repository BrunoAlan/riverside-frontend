# Selector de voz en la pantalla de bienvenida

**Fecha:** 2026-06-01
**Rama:** `feat/welcome-voice-selector`
**Estado:** diseño aprobado, pendiente de plan de implementación

## Objetivo

Permitir que el usuario elija la voz del agente **antes** de iniciar la
conversación. En la pantalla de bienvenida, junto al botón de inicio, un ícono
despliega un selector de voces. La voz elegida se aplica desde el primer saludo
del agente (no hay "flicker" con la voz por defecto).

TTS provider: **Cartesia**. El catálogo de voces se identifica por `voice_id`
de Cartesia.

## Decisiones de alcance (YAGNI)

Incluido en esta versión:

- Lista curada simple de voces (id + nombre legible).
- Selección antes de conectar; aplicada vía metadata de dispatch.

Explícitamente **fuera** de alcance (no pedido):

- Preview de audio de cada voz.
- Persistencia de la elección entre sesiones (localStorage).
- Agrupación o etiquetado por idioma/acento.
- Cambio de voz en runtime (una vez iniciada la conversación).

## Por qué metadata de dispatch (y no FrontendIntent)

En la pantalla de bienvenida todavía no existe sala ni participante: la
conexión ocurre recién al pulsar "Start". Dos caminos posibles:

- **Metadata de dispatch (elegido):** el `voice_id` viaja en
  `room_config.agents[].metadata` al pedir el token. El agente lo lee al
  arrancar y configura Cartesia antes de hablar. Cumple literalmente "cambiar
  la voz antes de iniciar".
- FrontendIntent tras conectar (descartado): el agente arrancaría con la voz
  por defecto y cambiaría después — posible flicker en el saludo. Además el
  canal `FrontendIntent` requiere participante, que no existe en la welcome.

## Arquitectura actual relevante

- `components/layout/welcome-view.tsx` — card presentacional (íconos
  mic/altavoz, título, botón). Sin estado propio.
- `components/agent-ui/views/start-view.tsx` — llama a `session.start()` al
  hacer click; inyecta `startButtonText` desde `useAppConfig()`.
- `components/layout/app.tsx` — crea `tokenSource` (`useMemo([appConfig])`) y
  `session` (`useSession`). El token se pide al hacer `start()`.
- `lib/utils.ts` → `getSandboxTokenSource(appConfig)` — construye `room_config`
  con `agents: [{ agent_name }]` y hace POST al endpoint de conexión.
- `app/api/token/route.ts` — reenvía `room_config` desde el body del request a
  `RoomConfiguration`.
- `lib/agent-ui/ui-view-store.ts` — patrón establecido de store vanilla de
  zustand (`createStore` + `useStore`).

## Componentes a crear / modificar

### 1. Catálogo de voces — `app-config.ts` (modificar)

Regla dura del repo: branding, feature flags y presets viven solo acá.

Agregar a la interfaz `AppConfig`:

```ts
voices?: { id: string; label: string }[]; // id = voice_id de Cartesia
defaultVoiceId?: string;
```

Cargar en `APP_CONFIG_DEFAULTS` la lista curada de voces Cartesia (IDs +
nombres legibles, provistos por el equipo) y un `defaultVoiceId`.

Contrato: si `voices` está vacío o ausente, el selector no se renderiza y el
flujo usa la voz por defecto del agente (degradación limpia).

### 2. Estado de la voz elegida — `lib/agent-ui/voice-store.ts` (nuevo)

Store vanilla de zustand, mismo patrón que `ui-view-store.ts`:

```ts
interface VoiceState {
  voiceId: string | null;
  setVoiceId: (id: string) => void;
}
```

Vive a nivel módulo (singleton exportado, igual que `uiViewStore`) para que el
closure del token source pueda leer `voiceStore.getState().voiceId` en el
momento del `start()`, sin recrear la sesión. Hook `useVoiceId()` para la UI.

Inicialización: el componente que monta el selector setea el `defaultVoiceId`
del config como valor inicial si el store está en `null`.

### 3. UI — ícono + selector

`components/layout/welcome-view.tsx` (modificar): se mantiene presentacional.
Nuevas props:

```ts
voices: { id: string; label: string }[];
selectedVoiceId: string | null;
onSelectVoice: (id: string) => void;
```

Render: un `DropdownMenu` (shadcn, ya disponible en `components/ui/`)
disparado por un **icono** ubicado **al lado del botón "Start"** dentro de la
card. Items tipo radio (`DropdownMenuRadioGroup` / `DropdownMenuRadioItem`) con
cada voz; marca la seleccionada. Si `voices` está vacío, no se renderiza el
ícono.

`components/agent-ui/views/start-view.tsx` (modificar): inyecta `voices` y
`defaultVoiceId` desde `useAppConfig()`, y `selectedVoiceId` / `onSelectVoice`
desde el `voice-store`.

### 4. Pasar la voz al agente — `lib/utils.ts` + `app/api/token/route.ts`

En `getSandboxTokenSource`, al construir `room_config`, leer el `voiceId` del
store y agregar metadata al agente:

```ts
const voiceId = voiceStore.getState().voiceId;
const roomConfig = appConfig.agentName
  ? {
      agents: [
        {
          agent_name: appConfig.agentName,
          ...(voiceId ? { metadata: JSON.stringify({ voice_id: voiceId }) } : {}),
        },
      ],
    }
  : undefined;
```

`app/api/token/route.ts` ya reenvía `room_config` desde el body a
`RoomConfiguration.fromJson(...)`, por lo que la metadata del agente fluye sin
cambios adicionales en esa ruta (verificar que `metadata` sobreviva la
deserialización; si no, ajustar el mapeo).

Extraer la construcción de `room_config` a una función pura testeable, p. ej.
`buildRoomConfig(appConfig, voiceId)`, para poder testearla sin red.

### 5. Dependencia de backend (fuera de este repo)

El agente debe leer `ctx.job.metadata` (la dispatch metadata) al arrancar,
parsear `{ voice_id }` y configurar la voz de Cartesia con ese `voice_id`. Si
la metadata no está presente, usa su voz por defecto. Esto se coordina con el
equipo de backend; el frontend queda listo y degrada bien sin el cambio.

## Flujo de datos

```
WelcomeView (elige voz → setVoiceId en voice-store)
  → click "Start"
  → StartView: session.start()
  → token source: lee voiceId del store
  → buildRoomConfig → room_config.agents[].metadata = { voice_id }
  → POST endpoint de conexión → token
  → agente arranca, lee ctx.job.metadata → Cartesia con voice_id
```

## Manejo de errores / degradación

- Sin `voices` en config → no se muestra el ícono; voz por defecto del agente.
- `voiceId === null` al conectar → no se agrega metadata; voz por defecto.
- Backend aún sin soporte de metadata → ignora la metadata; voz por defecto.

## Testing (tests al lado del código)

- `lib/agent-ui/voice-store.test.ts`: set/get de `voiceId`, valor inicial.
- `lib/utils.test.ts` (o donde viva `buildRoomConfig`): con `voiceId` arma
  `agents[0].metadata` con el JSON correcto; sin `voiceId` omite `metadata`;
  sin `agentName` devuelve `undefined`.

## Criterios de éxito

1. En la welcome, junto al botón Start, aparece un ícono que despliega la lista
   de voces curada y permite seleccionar una.
2. Al iniciar, el `room_config` enviado incluye
   `agents[0].metadata = '{"voice_id":"<elegido>"}'`.
3. `pnpm lint` y `pnpm test` pasan limpios.
4. Sin voces configuradas o sin selección, el flujo actual no cambia.
