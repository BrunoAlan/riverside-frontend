# Views Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modelar las 6 pantallas del producto como views en el agent-UI store (`start`, `presentation`, `dream_stage`, `itinerary`, `compare_itinerary`, `cabin_selection`), permitir navegar a cualquiera desde el dev panel sin iniciar sesión LiveKit, y mantener los comandos backend actuales mapeándolos a los nombres nuevos.

**Architecture:** Tres cambios coordinados: (a) tipos + store reciben las nuevas views y un source `'user'` + action `setViewFromUser`; (b) registry y views nuevos en `components/app/agent-ui/views/` envuelven los `content-panels` existentes; (c) `ViewController` deja de tener gate local — lo decide el store, y `WindowBackground` queda por fuera de `AnimatePresence` para evitar reload del video al transicionar start → presentation. Un `AppConfigContext` nuevo evita prop drilling de `startButtonText` al wrapper `StartView`.

**Tech Stack:** TypeScript, React 19, Next.js 16 App Router, Zustand, Zod (sin cambios), Vitest, `@livekit/components-react`.

---

### Task 1: Tipos `UiView` con 6 variantes + source `'user'`

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`

- [ ] **Step 1: Reescribir tipos**

Reemplazar el contenido completo de `lib/agent-ui/ui-view-types.ts` con:

```ts
import type { ItineraryOption } from './commands';

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

- [ ] **Step 2: Verificar typecheck (esperamos errores en archivos consumidores — son normales y se resuelven en tasks siguientes)**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL — errores en `ui-view-store.ts`, `dev/mocks.ts`, `view-registry.ts`, `views/discovery-canvas-view.tsx`, `views/itinerary-options-view.tsx`. Esto confirma que los tipos cambiaron.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts
git commit -m "feat(agent-ui): redefine UiView with 6 variants and add 'user' source"
```

---

### Task 2: Store — default `start`, rename de targets, action `setViewFromUser`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Actualizar tests primero (TDD)**

Reemplazar el contenido completo de `lib/agent-ui/ui-view-store.test.ts` con:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createUiViewStore } from './ui-view-store';

describe('ui-view-store', () => {
  let store: ReturnType<typeof createUiViewStore>;

  beforeEach(() => {
    store = createUiViewStore();
  });

  it('initializes with start view and initial source', () => {
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.hint).toBeNull();
    expect(s.source).toBe('initial');
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('applyCommand(show_discovery_canvas) maps to presentation view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c1');
    expect(s.hint).toBeNull();
  });

  it('applyCommand(show_itinerary_options) maps to compare_itinerary view', () => {
    store.getState().applyCommand({
      type: 'show_itinerary_options',
      correlation_id: 'c2',
      payload: {
        options: [
          {
            id: 'a',
            name: 'A',
            embarkation_port: 'X',
            disembarkation_port: 'Y',
            match_score: 1,
          },
        ],
      },
    });
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'compare_itinerary',
      options: [
        {
          id: 'a',
          name: 'A',
          embarkation_port: 'X',
          disembarkation_port: 'Y',
          match_score: 1,
        },
      ],
    });
    expect(s.source).toBe('agent');
  });

  it('applyCommand(soft_redirect) sets hint without changing view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlation_id: 'c2',
      payload: { reason_code: 'MISSING_DATE', missing: ['dates'] },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.hint).toEqual({
      type: 'soft_redirect',
      reasonCode: 'MISSING_DATE',
      missing: ['dates'],
    });
    expect(s.lastCorrelationId).toBe('c2');
  });

  it('non-hint command clears existing hint', () => {
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlation_id: 'c1',
      payload: { reason_code: 'MISSING_DATE' },
    });
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c2',
    });
    expect(store.getState().hint).toBeNull();
  });

  it('setViewFromDev sets view + dev source and clears lastCorrelationId', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    store.getState().setViewFromDev({ type: 'dream_stage' });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'dream_stage' });
    expect(s.source).toBe('dev');
    expect(s.lastCorrelationId).toBeNull();
  });

  it('setViewFromUser sets view + user source and clears lastCorrelationId', () => {
    store.getState().setViewFromUser({ type: 'presentation' });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.source).toBe('user');
    expect(s.hint).toBeNull();
    expect(s.lastCorrelationId).toBeNull();
  });

  it('recordParseError stores last error without touching view', () => {
    store.getState().recordParseError({ message: 'bad payload' });
    const s = store.getState();
    expect(s.lastError).toEqual({ message: 'bad payload' });
    expect(s.view).toEqual({ type: 'start' });
  });
});
```

- [ ] **Step 2: Correr tests — esperamos que fallen**

Run: `pnpm test -- lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — el store todavía usa `discovery_canvas`/`itinerary_options` y no tiene `setViewFromUser`.

- [ ] **Step 3: Reescribir el store**

Reemplazar el contenido completo de `lib/agent-ui/ui-view-store.ts` con:

```ts
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { UiCommand } from './commands';
import type { UiHint, UiSource, UiView } from './ui-view-types';

interface UiViewState {
  view: UiView;
  hint: UiHint | null;
  source: UiSource;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  setViewFromUser: (view: UiView) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
}

const INITIAL_VIEW: UiView = { type: 'start' };

export function createUiViewStore() {
  return createStore<UiViewState>()((set) => ({
    view: INITIAL_VIEW,
    hint: null,
    source: 'initial',
    lastCorrelationId: null,
    lastError: null,

    applyCommand: (cmd) =>
      set(() => {
        switch (cmd.type) {
          case 'show_discovery_canvas':
            return {
              view: { type: 'presentation' },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'show_itinerary_options':
            return {
              view: { type: 'compare_itinerary', options: cmd.payload.options },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'soft_redirect':
            return {
              hint: {
                type: 'soft_redirect',
                reasonCode: cmd.payload.reason_code,
                missing: cmd.payload.missing,
              },
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
        }
      }),

    setViewFromDev: (view) =>
      set({ view, hint: null, source: 'dev', lastCorrelationId: null }),

    setViewFromUser: (view) =>
      set({ view, hint: null, source: 'user', lastCorrelationId: null }),

    recordParseError: (err) => set({ lastError: err }),
  }));
}

// Singleton used by the running app.
export const uiViewStore = createUiViewStore();

// React hook over the singleton.
export function useUiViewStore<T>(selector: (s: UiViewState) => T): T {
  return useStore(uiViewStore, selector);
}
```

- [ ] **Step 4: Correr tests — deben pasar**

Run: `pnpm test -- lib/agent-ui/ui-view-store.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): map commands to new views and add setViewFromUser"
```

---

### Task 3: Selector hook `useSetViewFromUser`

**Files:**
- Modify: `lib/agent-ui/hooks.ts`

- [ ] **Step 1: Agregar hook**

Reemplazar el contenido completo de `lib/agent-ui/hooks.ts` con:

```ts
import { useUiViewStore } from './ui-view-store';

export const useUiView = () => useUiViewStore((s) => s.view);
export const useUiHint = () => useUiViewStore((s) => s.hint);
export const useUiSource = () => useUiViewStore((s) => s.source);
export const useUiLastError = () => useUiViewStore((s) => s.lastError);
export const useSetViewFromDev = () => useUiViewStore((s) => s.setViewFromDev);
export const useSetViewFromUser = () => useUiViewStore((s) => s.setViewFromUser);
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-ui/hooks.ts
git commit -m "feat(agent-ui): expose useSetViewFromUser selector"
```

---

### Task 4: `AppConfigContext` para evitar prop drilling

**Files:**
- Create: `components/app/app-config-context.tsx`

- [ ] **Step 1: Crear context**

```tsx
'use client';

import { createContext, useContext } from 'react';
import type { AppConfig } from '@/app-config';

const AppConfigContext = createContext<AppConfig | null>(null);

export function AppConfigProvider({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfig {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/app-config-context.tsx
git commit -m "feat(app): add AppConfigContext"
```

---

### Task 5: View wrapper — `start-view.tsx`

**Files:**
- Create: `components/app/agent-ui/views/start-view.tsx`

- [ ] **Step 1: Crear wrapper**

```tsx
'use client';

import { useSessionContext } from '@livekit/components-react';
import { useAppConfig } from '@/components/app/app-config-context';
import { WelcomeView } from '@/components/app/welcome-view';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';

export function StartView() {
  const { start } = useSessionContext();
  const setView = useSetViewFromUser();
  const config = useAppConfig();

  const handleStart = () => {
    setView({ type: 'presentation' });
    start();
  };

  return <WelcomeView startButtonText={config.startButtonText} onStartCall={handleStart} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/agent-ui/views/start-view.tsx
git commit -m "feat(agent-ui): add StartView wrapper"
```

---

### Task 6: View wrappers — presentation / dream_stage / itinerary / cabin_selection

**Files:**
- Create: `components/app/agent-ui/views/presentation-view.tsx`
- Create: `components/app/agent-ui/views/dream-stage-view.tsx`
- Create: `components/app/agent-ui/views/itinerary-view.tsx`
- Create: `components/app/agent-ui/views/cabin-selection-view.tsx`

- [ ] **Step 1: `presentation-view.tsx` (fragmento vacío — el video lo aporta ViewController)**

```tsx
'use client';

export function PresentationView() {
  return <></>;
}
```

- [ ] **Step 2: `dream-stage-view.tsx`**

```tsx
'use client';

import { PanelDream } from '@/components/app/content-panels/panel-dream';

export function DreamStageView() {
  return <PanelDream />;
}
```

- [ ] **Step 3: `itinerary-view.tsx`**

```tsx
'use client';

import { PanelMap } from '@/components/app/content-panels/panel-map';

export function ItineraryView() {
  return <PanelMap />;
}
```

- [ ] **Step 4: `cabin-selection-view.tsx`**

```tsx
'use client';

import { PanelCabinSelection } from '@/components/app/content-panels/panel-cabin-selection';

export function CabinSelectionView() {
  return <PanelCabinSelection />;
}
```

- [ ] **Step 5: Commit**

```bash
git add components/app/agent-ui/views/presentation-view.tsx components/app/agent-ui/views/dream-stage-view.tsx components/app/agent-ui/views/itinerary-view.tsx components/app/agent-ui/views/cabin-selection-view.tsx
git commit -m "feat(agent-ui): add presentation, dream_stage, itinerary, cabin_selection view wrappers"
```

---

### Task 7: View wrapper — `compare-itinerary-view.tsx` (reemplaza `itinerary-options-view.tsx`)

**Files:**
- Create: `components/app/agent-ui/views/compare-itinerary-view.tsx`
- Delete: `components/app/agent-ui/views/itinerary-options-view.tsx`

- [ ] **Step 1: Crear wrapper nuevo (mismo cuerpo que `itinerary-options-view.tsx`, ajustando tipo `view`)**

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="bg-beige-200 h-full w-full" /> }
);

function resolveItinerary(optionId: string, fallbackIndex: number) {
  return itineraries.find((i) => i.id === optionId) ?? itineraries[fallbackIndex];
}

export function CompareItineraryView({
  view,
}: {
  view: Extract<UiView, { type: 'compare_itinerary' }>;
}) {
  const handleCityExpand = useCallback((city: City) => {
    console.log('expand city', city.id);
  }, []);

  const [first, second] = view.options;
  const left = resolveItinerary(first?.id ?? '', 0);
  const right = resolveItinerary(second?.id ?? '', 1);

  return (
    <div className="fixed inset-0 flex">
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={left.cities}
          center={left.center}
          zoom={left.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>
      <div className="relative h-full w-1/2">
        <MapCanvas
          cities={right.cities}
          center={right.center}
          zoom={right.zoom}
          onCityExpand={handleCityExpand}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Borrar el view viejo**

Run: `rm components/app/agent-ui/views/itinerary-options-view.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/app/agent-ui/views/compare-itinerary-view.tsx components/app/agent-ui/views/itinerary-options-view.tsx
git commit -m "feat(agent-ui): rename itinerary_options view to compare_itinerary"
```

---

### Task 8: Eliminar `discovery-canvas-view.tsx`

**Files:**
- Delete: `components/app/agent-ui/views/discovery-canvas-view.tsx`

- [ ] **Step 1: Borrar archivo**

Run: `rm components/app/agent-ui/views/discovery-canvas-view.tsx`

- [ ] **Step 2: Commit**

```bash
git add components/app/agent-ui/views/discovery-canvas-view.tsx
git commit -m "chore(agent-ui): remove obsolete discovery-canvas-view"
```

---

### Task 9: `VIEW_REGISTRY` con 6 entradas

**Files:**
- Modify: `components/app/agent-ui/view-registry.ts`

- [ ] **Step 1: Reescribir registry**

Reemplazar el contenido completo de `components/app/agent-ui/view-registry.ts` con:

```ts
import type { ComponentType } from 'react';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { CabinSelectionView } from './views/cabin-selection-view';
import { CompareItineraryView } from './views/compare-itinerary-view';
import { DreamStageView } from './views/dream-stage-view';
import { ItineraryView } from './views/itinerary-view';
import { PresentationView } from './views/presentation-view';
import { StartView } from './views/start-view';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};

export const VIEW_REGISTRY: ViewRegistry = {
  start: StartView,
  presentation: PresentationView,
  dream_stage: DreamStageView,
  itinerary: ItineraryView,
  compare_itinerary: CompareItineraryView,
  cabin_selection: CabinSelectionView,
};
```

- [ ] **Step 2: Commit**

```bash
git add components/app/agent-ui/view-registry.ts
git commit -m "feat(agent-ui): wire VIEW_REGISTRY with 6 entries"
```

---

### Task 10: `VIEW_MOCKS` con 6 mocks

**Files:**
- Modify: `components/app/agent-ui/dev/mocks.ts`

- [ ] **Step 1: Reescribir mocks**

Reemplazar el contenido completo de `components/app/agent-ui/dev/mocks.ts` con:

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  start: [{ id: 'default', label: 'Default', view: { type: 'start' } }],
  presentation: [
    { id: 'default', label: 'Video playing', view: { type: 'presentation' } },
  ],
  dream_stage: [
    { id: 'default', label: 'Dream collage', view: { type: 'dream_stage' } },
  ],
  itinerary: [{ id: 'default', label: 'Map', view: { type: 'itinerary' } }],
  compare_itinerary: [
    {
      id: 'two_danube_options',
      label: 'Two Danube options',
      view: {
        type: 'compare_itinerary',
        options: [
          {
            id: 'majesty_of_the_danube',
            name: 'Majesty of the Danube',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
          {
            id: 'majesty_of_the_danube_scenic_wachau_from_budapest_to_vienna',
            name: 'Majesty of the Danube & Scenic Wachau from Budapest to Vienna',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
        ],
      },
    },
  ],
  cabin_selection: [
    { id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add components/app/agent-ui/dev/mocks.ts
git commit -m "feat(agent-ui): add mock per view (6 mocks)"
```

---

### Task 11: Dev panel — botón Reset

**Files:**
- Modify: `components/app/agent-ui/dev/dev-panel.tsx`

- [ ] **Step 1: Agregar botón Reset junto al botón Apply**

Editar `components/app/agent-ui/dev/dev-panel.tsx`. Cambiar el bloque del botón Apply para incluir Reset al lado:

Reemplazar:
```tsx
          <button type="button" onClick={apply} className="w-full rounded bg-white text-black">
            Apply
          </button>
```

Con:
```tsx
          <div className="flex gap-2">
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded bg-white text-black"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setViewFromDev({ type: 'start' })}
              className="rounded bg-white/20 px-2 text-white"
            >
              Reset
            </button>
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add components/app/agent-ui/dev/dev-panel.tsx
git commit -m "feat(agent-ui): add Reset button to dev panel"
```

---

### Task 12: `ViewController` lee del store + `WindowBackground` fuera de AnimatePresence

**Files:**
- Modify: `components/app/view-controller.tsx`

- [ ] **Step 1: Reescribir ViewController**

Reemplazar el contenido completo de `components/app/view-controller.tsx` con:

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ContentView } from '@/components/app/agent-ui/content-view';
import { WindowBackground } from '@/components/app/window-background';
import { useUiView } from '@/lib/agent-ui/hooks';

const MotionContentView = motion.create(ContentView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.5, ease: 'linear' },
};

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

Nota: ya no se importa `WelcomeView` aquí (vive en `StartView` via registry), ni `useSessionContext`, ni `useState`. Tampoco recibe `appConfig` por props.

- [ ] **Step 2: Commit**

```bash
git add components/app/view-controller.tsx
git commit -m "refactor(app): drive ViewController from store; keep WindowBackground stable across start↔presentation"
```

---

### Task 13: `App` provee `AppConfigContext` y deja de pasar `appConfig` a `ViewController`

**Files:**
- Modify: `components/app/app.tsx`

- [ ] **Step 1: Reescribir `app.tsx`**

Reemplazar el contenido completo de `components/app/app.tsx` con:

```tsx
'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { DevPanel } from '@/components/app/agent-ui/dev/dev-panel';
import { AppConfigProvider } from '@/components/app/app-config-context';
import { ViewController } from '@/components/app/view-controller';
import { AgentSessionProvider } from '@/components/livekit/agent-session-provider';
import { StartAudioButton } from '@/components/livekit/start-audio-button';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AppConfigProvider config={appConfig}>
      <AgentSessionProvider session={session}>
        <AppSetup />
        <div className="grid h-full grid-cols-1 grid-rows-1">
          <ViewController />
        </div>
        <StartAudioButton label="Start Audio" />
        {IN_DEVELOPMENT && <DevPanel />}
      </AgentSessionProvider>
    </AppConfigProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/app.tsx
git commit -m "feat(app): provide AppConfigContext; drop appConfig prop from ViewController"
```

---

### Task 14: Verificación final

- [ ] **Step 1: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 2: Tests**

Run: `pnpm test`
Expected: todas las suites pasan (al menos `commands.test.ts`, `ui-view-store.test.ts` con 7 tests, `transport.test.ts`).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: sin warnings ni errores.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: compila sin errores.
