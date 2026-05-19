# Agent-Driven UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the LiveKit agent control which view renders (and with what data) via `ui-commands` text streams, while giving developers a local dev panel to switch views with mock payloads.

**Architecture:** Three-layer split inside `lib/agent-ui/` (transport ⇄ store ⇄ hooks) consumed by `components/app/agent-ui/`. Zod validates commands at the boundary. Zustand holds a single current `view` + optional `hint`. Existing panels are moved into `views/` and consume `payload` via props instead of a local context.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest, LiveKit (`livekit-client`, `@livekit/components-react`), Zod, Zustand.

**Spec:** `docs/superpowers/specs/2026-05-19-agent-driven-ui-design.md`.

**Test scope:** Vitest is configured with `include: ['lib/**/*.test.ts']`, environment `node`. All TDD steps below live under `lib/agent-ui/`. The render layer (components) is verified manually via the dev panel and `pnpm build` typecheck — no jsdom/RTL stack is introduced.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via `pnpm add`)

- [ ] **Step 1: Install runtime deps**

Run:
```bash
pnpm add zod zustand
```

Expected: both packages added to `dependencies` in `package.json`, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Verify install**

Run:
```bash
node -e "console.log(require('zod/package.json').version, require('zustand/package.json').version)"
```
Expected: prints two version numbers.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add zod and zustand for agent-driven UI"
```

---

## Task 2: Cleanup boilerplate — delete orphan files

Removes files in `components/agents-ui/` and `hooks/agents-ui/` that have no consumers outside that folder.

**Files:**
- Delete: `components/agents-ui/agent-audio-visualizer-aura.tsx`
- Delete: `components/agents-ui/agent-audio-visualizer-bar.tsx`
- Delete: `components/agents-ui/agent-audio-visualizer-grid.tsx`
- Delete: `components/agents-ui/agent-audio-visualizer-radial.tsx`
- Delete: `components/agents-ui/agent-audio-visualizer-wave.tsx`
- Delete: `components/agents-ui/agent-control-bar.tsx`
- Delete: `components/agents-ui/agent-track-control.tsx`
- Delete: `components/agents-ui/agent-track-toggle.tsx`
- Delete: `components/agents-ui/agent-disconnect-button.tsx`
- Delete: `components/agents-ui/agent-chat-transcript.tsx`
- Delete: `components/agents-ui/react-shader-toy.tsx`
- Delete: `components/agents-ui/blocks/` (recursive)
- Delete: `hooks/agents-ui/` (recursive)

- [ ] **Step 1: Confirm no external references**

Run:
```bash
grep -rln "agents-ui/agent-audio-visualizer\|agents-ui/agent-control-bar\|agents-ui/agent-track\|agents-ui/agent-disconnect\|agents-ui/agent-chat-transcript\|agents-ui/react-shader-toy\|agents-ui/blocks\|hooks/agents-ui" --include="*.ts" --include="*.tsx" app components hooks lib 2>/dev/null
```
Expected: only matches *inside* `components/agents-ui/` or `hooks/agents-ui/` themselves (self-references). No matches from `app/`, `components/app/`, `components/chat/`, `lib/`.

If any external reference appears, STOP and report.

- [ ] **Step 2: Remove the files**

```bash
rm components/agents-ui/agent-audio-visualizer-aura.tsx \
   components/agents-ui/agent-audio-visualizer-bar.tsx \
   components/agents-ui/agent-audio-visualizer-grid.tsx \
   components/agents-ui/agent-audio-visualizer-radial.tsx \
   components/agents-ui/agent-audio-visualizer-wave.tsx \
   components/agents-ui/agent-control-bar.tsx \
   components/agents-ui/agent-track-control.tsx \
   components/agents-ui/agent-track-toggle.tsx \
   components/agents-ui/agent-disconnect-button.tsx \
   components/agents-ui/agent-chat-transcript.tsx \
   components/agents-ui/react-shader-toy.tsx
rm -rf components/agents-ui/blocks hooks/agents-ui
```

- [ ] **Step 3: Run typecheck**

Run:
```bash
pnpm exec tsc --noEmit
```
Expected: PASS. If failures, they should be inside `components/agents-ui/` survivor files (`agent-session-provider.tsx`, `start-audio-button.tsx`, `agent-chat-indicator.tsx`) referencing now-deleted siblings — verify by reading those three files and stop if so.

- [ ] **Step 4: Commit**

```bash
git add -A components/agents-ui hooks/agents-ui
git commit -m "chore: remove unused livekit boilerplate (visualizers, control bar, blocks)"
```

---

## Task 3: Cleanup boilerplate — move survivors to `components/livekit/`

The 3 boilerplate files still in use (`AgentSessionProvider`, `StartAudioButton`, `AgentChatIndicator`) are pure LiveKit adapters. Move them out of `components/agents-ui/` so the name doesn't collide with our new `components/app/agent-ui/`.

**Files:**
- Move: `components/agents-ui/agent-session-provider.tsx` → `components/livekit/agent-session-provider.tsx`
- Move: `components/agents-ui/start-audio-button.tsx` → `components/livekit/start-audio-button.tsx`
- Move: `components/agents-ui/agent-chat-indicator.tsx` → `components/livekit/agent-chat-indicator.tsx`
- Delete: `components/agents-ui/` (now empty)
- Modify: `components/app/app.tsx` (2 imports)
- Modify: `components/chat/chat.tsx` (1 import)

- [ ] **Step 1: Move the files**

```bash
mkdir -p components/livekit
git mv components/agents-ui/agent-session-provider.tsx components/livekit/agent-session-provider.tsx
git mv components/agents-ui/start-audio-button.tsx components/livekit/start-audio-button.tsx
git mv components/agents-ui/agent-chat-indicator.tsx components/livekit/agent-chat-indicator.tsx
rmdir components/agents-ui
```

- [ ] **Step 2: Update `components/app/app.tsx` imports**

Replace lines 7–8 of `components/app/app.tsx`:

From:
```ts
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
```

To:
```ts
import { AgentSessionProvider } from '@/components/livekit/agent-session-provider';
import { StartAudioButton } from '@/components/livekit/start-audio-button';
```

- [ ] **Step 3: Update `components/chat/chat.tsx` import**

Replace line 4 of `components/chat/chat.tsx`:

From:
```ts
import { AgentChatIndicator } from '@/components/agents-ui/agent-chat-indicator';
```

To:
```ts
import { AgentChatIndicator } from '@/components/livekit/agent-chat-indicator';
```

- [ ] **Step 4: Verify**

```bash
grep -rn "components/agents-ui\|@/components/agents-ui" --include="*.ts" --include="*.tsx" app components 2>/dev/null
```
Expected: no matches.

```bash
pnpm exec tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A components/agents-ui components/livekit components/app/app.tsx components/chat/chat.tsx
git commit -m "chore: move livekit adapters from agents-ui to components/livekit"
```

---

## Task 4: Define UI command schema with Zod

**Files:**
- Create: `lib/agent-ui/commands.ts`
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/agent-ui/commands.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { UiCommand } from './commands';

describe('UiCommand schema', () => {
  it('parses show_discovery_canvas with empty payload', () => {
    const result = UiCommand.parse({
      type: 'show_discovery_canvas',
      correlation_id: 'abc-123',
    });
    expect(result.type).toBe('show_discovery_canvas');
    expect(result.correlation_id).toBe('abc-123');
  });

  it('parses soft_redirect with reason_code and missing', () => {
    const result = UiCommand.parse({
      type: 'soft_redirect',
      correlation_id: 'abc-123',
      payload: { reason_code: 'MISSING_DATE_PREFERENCE', missing: ['dates'] },
    });
    if (result.type !== 'soft_redirect') throw new Error('discriminator failed');
    expect(result.payload.reason_code).toBe('MISSING_DATE_PREFERENCE');
    expect(result.payload.missing).toEqual(['dates']);
  });

  it('parses show_itinerary_options with one option', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlation_id: 'abc-123',
      payload: {
        options: [
          {
            id: 'majesty_of_the_danube',
            name: 'Majesty of the Danube',
            embarkation_port: 'Budapest',
            disembarkation_port: 'Vienna',
            match_score: 1.0,
          },
        ],
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.options).toHaveLength(1);
    expect(result.payload.options[0].id).toBe('majesty_of_the_danube');
  });

  it('rejects show_itinerary_options with zero options', () => {
    const out = UiCommand.safeParse({
      type: 'show_itinerary_options',
      correlation_id: 'abc-123',
      payload: { options: [] },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown command type', () => {
    const out = UiCommand.safeParse({
      type: 'totally_made_up',
      correlation_id: 'abc-123',
    });
    expect(out.success).toBe(false);
  });

  it('rejects missing correlation_id', () => {
    const out = UiCommand.safeParse({ type: 'show_discovery_canvas' });
    expect(out.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm test lib/agent-ui/commands.test.ts
```
Expected: FAIL with "Cannot find module './commands'" or equivalent.

- [ ] **Step 3: Implement `commands.ts`**

Create `lib/agent-ui/commands.ts`:

```ts
import { z } from 'zod';

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

export const ItineraryOption = z.object({
  id: z.string(),
  name: z.string(),
  embarkation_port: z.string(),
  disembarkation_port: z.string(),
  match_score: z.number(),
});
export type ItineraryOption = z.infer<typeof ItineraryOption>;

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

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm test lib/agent-ui/commands.test.ts
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(agent-ui): add zod schemas for UI commands"
```

---

## Task 5: Build the UI view store

**Files:**
- Create: `lib/agent-ui/ui-view-types.ts` (shared types for view + hint)
- Create: `lib/agent-ui/ui-view-store.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the types module**

Create `lib/agent-ui/ui-view-types.ts`:

```ts
import type { ItineraryOption } from './commands';

export type UiView =
  | { type: 'discovery_canvas' }
  | { type: 'itinerary_options'; options: ItineraryOption[] };

export type UiHint =
  | { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev';
```

- [ ] **Step 2: Write the failing store tests**

Create `lib/agent-ui/ui-view-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createUiViewStore } from './ui-view-store';

describe('ui-view-store', () => {
  let store: ReturnType<typeof createUiViewStore>;

  beforeEach(() => {
    store = createUiViewStore();
  });

  it('initializes with discovery_canvas view and initial source', () => {
    const s = store.getState();
    expect(s.view).toEqual({ type: 'discovery_canvas' });
    expect(s.hint).toBeNull();
    expect(s.source).toBe('initial');
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('applyCommand(show_discovery_canvas) sets view + agent source + correlation', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlation_id: 'c1',
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'discovery_canvas' });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('c1');
    expect(s.hint).toBeNull();
  });

  it('applyCommand(show_itinerary_options) replaces view with options', () => {
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
      type: 'itinerary_options',
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
    expect(s.view).toEqual({ type: 'discovery_canvas' });
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
    store.getState().setViewFromDev({ type: 'discovery_canvas' });
    const s = store.getState();
    expect(s.source).toBe('dev');
    expect(s.lastCorrelationId).toBeNull();
  });

  it('recordParseError stores last error without touching view', () => {
    store.getState().recordParseError({ message: 'bad payload' });
    const s = store.getState();
    expect(s.lastError).toEqual({ message: 'bad payload' });
    expect(s.view).toEqual({ type: 'discovery_canvas' });
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
pnpm test lib/agent-ui/ui-view-store.test.ts
```
Expected: FAIL with module not found.

- [ ] **Step 4: Implement the store**

Create `lib/agent-ui/ui-view-store.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
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
  recordParseError: (err: { correlationId?: string; message: string }) => void;
}

const INITIAL_VIEW: UiView = { type: 'discovery_canvas' };

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
              view: { type: 'discovery_canvas' },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'show_itinerary_options':
            return {
              view: { type: 'itinerary_options', options: cmd.payload.options },
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

- [ ] **Step 5: Run tests, verify they pass**

```bash
pnpm test lib/agent-ui/ui-view-store.test.ts
```
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): add zustand store for UI view state"
```

---

## Task 6: Add React selectors

**Files:**
- Create: `lib/agent-ui/hooks.ts`

- [ ] **Step 1: Implement selectors**

Create `lib/agent-ui/hooks.ts`:

```ts
import { useUiViewStore } from './ui-view-store';

export const useUiView = () => useUiViewStore((s) => s.view);
export const useUiHint = () => useUiViewStore((s) => s.hint);
export const useUiSource = () => useUiViewStore((s) => s.source);
export const useUiLastError = () => useUiViewStore((s) => s.lastError);
export const useSetViewFromDev = () => useUiViewStore((s) => s.setViewFromDev);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/hooks.ts
git commit -m "feat(agent-ui): expose store selectors"
```

---

## Task 7: Build the transport layer

**Files:**
- Create: `lib/agent-ui/transport.ts`
- Test: `lib/agent-ui/transport.test.ts`

The transport hook is a React effect, but its core logic is a pure async function `handleStream(reader, applyCommand, recordParseError)` we can unit-test directly without React.

- [ ] **Step 1: Write the failing tests**

Create `lib/agent-ui/transport.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { handleUiCommandStream } from './transport';

function fakeReader(payload: string) {
  return { readAll: async () => payload } as { readAll: () => Promise<string> };
}

describe('handleUiCommandStream', () => {
  it('parses valid JSON command and forwards to applyCommand', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    const reader = fakeReader(
      JSON.stringify({ type: 'show_discovery_canvas', correlation_id: 'c1' })
    );
    await handleUiCommandStream(reader, apply, recordError);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0].type).toBe('show_discovery_canvas');
    expect(recordError).not.toHaveBeenCalled();
  });

  it('records error and does not call applyCommand for invalid JSON', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    await handleUiCommandStream(fakeReader('not json'), apply, recordError);
    expect(apply).not.toHaveBeenCalled();
    expect(recordError).toHaveBeenCalledTimes(1);
    expect(recordError.mock.calls[0][0].message).toMatch(/JSON/i);
  });

  it('records error for valid JSON that fails schema', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    await handleUiCommandStream(
      fakeReader(JSON.stringify({ type: 'unknown_type', correlation_id: 'c1' })),
      apply,
      recordError
    );
    expect(apply).not.toHaveBeenCalled();
    expect(recordError).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm test lib/agent-ui/transport.test.ts
```
Expected: FAIL with module not found.

- [ ] **Step 3: Implement transport**

Create `lib/agent-ui/transport.ts`:

```ts
'use client';

import { useEffect } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { UiCommand } from './commands';
import { uiViewStore } from './ui-view-store';

const TOPIC = 'ui-commands';

interface ReaderLike {
  readAll: () => Promise<string>;
}

type ApplyFn = (cmd: import('./commands').UiCommand) => void;
type RecordErrorFn = (err: { correlationId?: string; message: string }) => void;

export async function handleUiCommandStream(
  reader: ReaderLike,
  applyCommand: ApplyFn,
  recordError: RecordErrorFn
): Promise<void> {
  const raw = await reader.readAll();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    recordError({ message: `JSON parse error: ${(e as Error).message}` });
    return;
  }
  const result = UiCommand.safeParse(json);
  if (!result.success) {
    const correlationId =
      typeof json === 'object' && json !== null && 'correlation_id' in json
        ? String((json as { correlation_id?: unknown }).correlation_id)
        : undefined;
    recordError({ correlationId, message: result.error.message });
    return;
  }
  applyCommand(result.data);
}

export function useUiCommandTransport(): void {
  const room = useMaybeRoomContext();
  useEffect(() => {
    if (!room) return;
    const handler = (reader: ReaderLike) => {
      const { applyCommand, recordParseError } = uiViewStore.getState();
      handleUiCommandStream(reader, applyCommand, recordParseError).catch((e) => {
        recordParseError({ message: `transport error: ${(e as Error).message}` });
      });
    };
    // `registerTextStreamHandler` expects a callback with (reader, participantInfo).
    room.registerTextStreamHandler(TOPIC, handler as never);
    return () => {
      room.unregisterTextStreamHandler(TOPIC);
    };
  }, [room]);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
pnpm test lib/agent-ui/transport.test.ts
```
Expected: 3 passed.

- [ ] **Step 5: Run all agent-ui tests + typecheck**

```bash
pnpm test lib/agent-ui
pnpm exec tsc --noEmit
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/transport.ts lib/agent-ui/transport.test.ts
git commit -m "feat(agent-ui): add livekit text stream transport"
```

---

## Task 8: Create render scaffolding (registry + fallback + hint overlay)

**Files:**
- Create: `components/app/agent-ui/fallback-view.tsx`
- Create: `components/app/agent-ui/hint-overlay.tsx`
- Create: `components/app/agent-ui/view-registry.ts`

- [ ] **Step 1: Implement `fallback-view.tsx`**

Create `components/app/agent-ui/fallback-view.tsx`:

```tsx
'use client';

export function FallbackView() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6 text-sm text-neutral-500">
      Esperando instrucciones del agente…
    </div>
  );
}
```

- [ ] **Step 2: Implement `hint-overlay.tsx`**

Create `components/app/agent-ui/hint-overlay.tsx`:

```tsx
'use client';

import { useUiHint } from '@/lib/agent-ui/hooks';

export function HintOverlay() {
  const hint = useUiHint();
  if (!hint) return null;
  if (hint.type === 'soft_redirect') {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 shadow">
        {hint.reasonCode}
        {hint.missing?.length ? ` · falta: ${hint.missing.join(', ')}` : null}
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 3: Implement `view-registry.ts` (with placeholder views to be replaced in Task 9)**

Create `components/app/agent-ui/view-registry.ts`:

```ts
import type { ComponentType } from 'react';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};
```

(The concrete `VIEW_REGISTRY` object is created in Task 9 once the view components exist.)

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app/agent-ui/fallback-view.tsx components/app/agent-ui/hint-overlay.tsx components/app/agent-ui/view-registry.ts
git commit -m "feat(agent-ui): add render scaffolding (registry types, fallback, hint overlay)"
```

---

## Task 9: Move existing panels into `views/` and build the registry

We adapt two existing panels to the new `{ view }` props signature. `PanelWindow` already takes no props — easy. `CompareItinerary` currently hardcodes `itineraries[0..1]`; we adapt it to receive options from the view payload.

**Files:**
- Create: `components/app/agent-ui/views/discovery-canvas-view.tsx`
- Create: `components/app/agent-ui/views/itinerary-options-view.tsx`
- Modify: `components/app/agent-ui/view-registry.ts` (add concrete registry)

- [ ] **Step 1: Implement `discovery-canvas-view.tsx`**

Create `components/app/agent-ui/views/discovery-canvas-view.tsx`:

```tsx
'use client';

import { WindowBackground } from '@/components/app/window-background';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function DiscoveryCanvasView(_: { view: Extract<UiView, { type: 'discovery_canvas' }> }) {
  return <WindowBackground isPlaying />;
}
```

- [ ] **Step 2: Implement `itinerary-options-view.tsx`**

The existing `CompareItinerary` renders two `MapCanvas` side by side from the hardcoded `itineraries` array. For the first pass we keep that visual but use the **first two options' ids** to look up matching itineraries in `lib/map/itineraries`. If the option doesn't match a known itinerary, we fall back to the existing static itineraries by index (so the screen never blanks while richer mapping data is added).

Create `components/app/agent-ui/views/itinerary-options-view.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { City } from '@/lib/map/cities';
import { itineraries } from '@/lib/map/itineraries';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

const MapCanvas = dynamic(
  () => import('@/components/app/content-panels/map-canvas').then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="bg-beige-200 h-full w-full" /> }
);

function resolveItinerary(optionId: string, fallbackIndex: number) {
  return itineraries.find((i) => i.id === optionId) ?? itineraries[fallbackIndex];
}

export function ItineraryOptionsView({
  view,
}: {
  view: Extract<UiView, { type: 'itinerary_options' }>;
}) {
  const handleCityExpand = useCallback((city: City) => {
    // Wiring of expand action is a follow-up; logging keeps parity with previous panel.
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

- [ ] **Step 3: Wire concrete `VIEW_REGISTRY`**

Replace the contents of `components/app/agent-ui/view-registry.ts` with:

```ts
import type { ComponentType } from 'react';
import { DiscoveryCanvasView } from './views/discovery-canvas-view';
import { ItineraryOptionsView } from './views/itinerary-options-view';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};

export const VIEW_REGISTRY: ViewRegistry = {
  discovery_canvas: DiscoveryCanvasView,
  itinerary_options: ItineraryOptionsView,
};
```

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app/agent-ui/views components/app/agent-ui/view-registry.ts
git commit -m "feat(agent-ui): add discovery_canvas and itinerary_options views"
```

---

## Task 10: Rewrite ContentView, mount transport, remove legacy selection

This task swaps over the runtime. After it, the agent (via `ui-commands`) is the sole driver of the rendered view in prod.

**Files:**
- Create: `components/app/agent-ui/content-view.tsx`
- Modify: `components/app/view-controller.tsx` (import path)
- Modify: `components/app/app.tsx` (mount transport hook)
- Modify: `app/agent/layout.tsx` (drop PanelSelectionProvider and PanelSelector)
- Delete: `components/app/content-view.tsx`
- Delete: `components/app/panel-selection-context.tsx`
- Delete: `components/app/panel-selector.tsx`
- Delete: `components/app/content-panels/registry.ts`

- [ ] **Step 1: Create the new ContentView**

Create `components/app/agent-ui/content-view.tsx`:

```tsx
'use client';

import { FallbackView } from './fallback-view';
import { HintOverlay } from './hint-overlay';
import { VIEW_REGISTRY } from './view-registry';
import { useUiView } from '@/lib/agent-ui/hooks';

export const ContentView = ({ ref }: React.ComponentProps<'div'>) => {
  const view = useUiView();
  const Component = VIEW_REGISTRY[view.type];

  return (
    <div ref={ref} className="relative z-10 h-full">
      {Component ? <Component view={view as never} /> : <FallbackView />}
      <HintOverlay />
    </div>
  );
};
```

- [ ] **Step 2: Update import in `view-controller.tsx`**

In `components/app/view-controller.tsx`, replace:

```ts
import { ContentView } from '@/components/app/content-view';
```

with:

```ts
import { ContentView } from '@/components/app/agent-ui/content-view';
```

- [ ] **Step 3: Mount the transport hook in `AppSetup`**

In `components/app/app.tsx`:

After the existing imports, add:

```ts
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
```

Inside `AppSetup`, after `useAgentErrors();`, add:

```ts
  useUiCommandTransport();
```

The function should now read:

```ts
function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  return null;
}
```

- [ ] **Step 4: Strip `PanelSelectionProvider` / `PanelSelector` from `app/agent/layout.tsx`**

Replace the entire contents of `app/agent/layout.tsx` with:

```tsx
import { AgentHeader } from '@/components/agent/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="bg-beige-200 flex h-screen flex-col">
      <div className="relative z-40">
        <AgentHeader />
      </div>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Delete legacy files**

```bash
rm components/app/content-view.tsx \
   components/app/panel-selection-context.tsx \
   components/app/panel-selector.tsx \
   components/app/content-panels/registry.ts
```

- [ ] **Step 6: Verify nothing else imports the deleted modules**

```bash
grep -rn "panel-selection-context\|panel-selector\|content-panels/registry\|from '@/components/app/content-view'" --include="*.ts" --include="*.tsx" app components hooks lib 2>/dev/null
```
Expected: no matches.

- [ ] **Step 7: Typecheck + tests + build**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: all PASS. Build succeeds with no missing import errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(agent-ui): drive ContentView from the agent store"
```

---

## Task 11: Dev panel + mocks

**Files:**
- Create: `components/app/agent-ui/dev/mocks.ts`
- Create: `components/app/agent-ui/dev/dev-panel.tsx`
- Modify: `components/app/app.tsx` (mount DevPanel under `process.env.NODE_ENV !== 'production'`)

- [ ] **Step 1: Define mocks**

Create `components/app/agent-ui/dev/mocks.ts`:

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export interface ViewMock {
  id: string;
  label: string;
  view: UiView;
}

export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  discovery_canvas: [
    {
      id: 'default',
      label: 'Default (window background)',
      view: { type: 'discovery_canvas' },
    },
  ],
  itinerary_options: [
    {
      id: 'two_danube_options',
      label: 'Two Danube options',
      view: {
        type: 'itinerary_options',
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
};
```

- [ ] **Step 2: Implement the dev panel**

Create `components/app/agent-ui/dev/dev-panel.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { VIEW_MOCKS } from './mocks';

const VIEW_TYPES = Object.keys(VIEW_MOCKS) as UiView['type'][];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const view = useUiView();
  const source = useUiSource();
  const lastError = useUiLastError();
  const setViewFromDev = useSetViewFromDev();

  const [type, setType] = useState<UiView['type']>(view.type);
  const mocks = VIEW_MOCKS[type];
  const [mockId, setMockId] = useState(mocks[0]?.id ?? '');

  const apply = () => {
    const chosen = mocks.find((m) => m.id === mockId) ?? mocks[0];
    if (chosen) setViewFromDev(chosen.view);
  };

  return (
    <div className="fixed right-3 bottom-3 z-[100] font-mono text-xs">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-black/80 px-2 py-1 text-white"
        >
          dev
        </button>
      )}
      {open && (
        <div className="w-72 space-y-2 rounded-md bg-black/80 p-3 text-white">
          <div className="flex items-center justify-between">
            <span>UI dev panel</span>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
          <div>
            current: <b>{view.type}</b> (source: {source})
          </div>
          <label className="block">
            view
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as UiView['type'];
                setType(nextType);
                setMockId(VIEW_MOCKS[nextType][0]?.id ?? '');
              }}
            >
              {VIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={mockId}
              onChange={(e) => setMockId(e.target.value)}
            >
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={apply}
            className="w-full rounded bg-white text-black"
          >
            Apply
          </button>
          {lastError && (
            <div className="rounded bg-red-900/60 p-1">
              last error: {lastError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount DevPanel in `app.tsx`**

In `components/app/app.tsx`, add the import:

```ts
import { DevPanel } from '@/components/app/agent-ui/dev/dev-panel';
```

And inside the `AgentSessionProvider`, right before the closing `</AgentSessionProvider>`, add:

```tsx
      {process.env.NODE_ENV !== 'production' && <DevPanel />}
```

The relevant block should now look like:

```tsx
    <AgentSessionProvider session={session}>
      <AppSetup />
      <div className="grid h-full grid-cols-1 grid-rows-1">
        <ViewController appConfig={appConfig} />
      </div>
      <StartAudioButton label="Start Audio" />
      {process.env.NODE_ENV !== 'production' && <DevPanel />}
    </AgentSessionProvider>
```

- [ ] **Step 4: Verify dev + prod**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: all PASS. Build output should not pull `dev-panel.tsx` into the production bundle (it is tree-shaken by the `process.env.NODE_ENV !== 'production'` guard; not strictly verifiable here but the guard is the contract).

Run the dev server briefly to confirm the panel renders:
```bash
pnpm dev
```
Open the app in a browser (default `http://localhost:3000`), click "dev" in the bottom-right, switch views, click Apply. Verify the page swaps between Discovery Canvas and Itinerary Options. Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add components/app/agent-ui/dev components/app/app.tsx
git commit -m "feat(agent-ui): add development panel for view mocking"
```

---

## Task 12: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run full pipeline**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm lint
pnpm build
```
Expected: all PASS. Note any warnings.

- [ ] **Step 2: Confirm wire is closed**

Run the dev server, connect to the agent (LiveKit). In the logs you previously saw lines like:

```
INFO root ignoring text stream with topic 'ui-commands', no callback attached
```

Expected: those lines should no longer appear in *new* sessions once Task 10 ships (the `ui-commands` handler is now registered). `lk.agent.request` topic warnings — if any — are unrelated and stay.

- [ ] **Step 3: Smoke test**

With the agent connected, say "Hi" (per the existing log trace). Expected: `show_discovery_canvas` arrives → store updates → ContentView renders `DiscoveryCanvasView`. Then mention a destination and dates ("Vienna, June second week") to trigger `show_itinerary_options` and verify the two-map layout shows up.

If the agent emits a `soft_redirect`, expected: the existing view stays put and the amber hint badge appears at the top.

- [ ] **Step 4: Final commit (only if anything was tweaked during verification)**

```bash
git status
# only commit if there are changes
```

---

## Out of scope (follow-ups, do not implement here)

These are explicitly **not** in this plan; they are tracked in the spec §12:

- Splitting `components/app/content-panels/` between building blocks (`city-card`, `map-canvas`, `cabin-card`, `city-card-layer`) and full screens.
- Deep-linking via URL.
- View history / back navigation.
- Animations between views.
- User-override of the agent.
