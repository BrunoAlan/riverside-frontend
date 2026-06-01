# Welcome Screen Voice Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick the agent's Cartesia voice from an icon-triggered dropdown next to the Start button on the welcome screen, applied before the conversation starts via room dispatch metadata.

**Architecture:** A curated voice catalog lives in `app-config.ts`. A module-level zustand store (`voice-store.ts`, mirroring `ui-view-store.ts`) holds the chosen `voiceId`. A pure `buildRoomConfig(agentName, voiceId)` helper embeds `{ voice_id }` as agent dispatch metadata in `room_config`. Both token-source paths (sandbox + local `/api/token`) read the store at `start()` time and send the metadata. The backend agent reads `ctx.job.metadata` to configure Cartesia (separate repo; out of scope here, degrades to default voice if absent).

**Tech Stack:** Next.js (App Router), React, TypeScript, zustand (vanilla store + `useStore`), shadcn `DropdownMenu`, LiveKit `TokenSource.custom`, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-welcome-voice-selector-design.md`

**Branch:** `feat/welcome-voice-selector` (already created and checked out)

---

## File Structure

- `app-config.ts` (modify) — add `voices` + `defaultVoiceId` to `AppConfig` and `APP_CONFIG_DEFAULTS`.
- `lib/agent-ui/voice-store.ts` (create) — vanilla zustand store holding the selected `voiceId` + `useVoiceStore` hook.
- `lib/agent-ui/voice-store.test.ts` (create) — store unit tests.
- `lib/utils.ts` (modify) — add pure `buildRoomConfig`; rewrite `getSandboxTokenSource` to use it; add `getLocalTokenSource`.
- `lib/utils.test.ts` (create) — `buildRoomConfig` unit tests.
- `components/layout/welcome-view.tsx` (modify) — add voice dropdown next to Start button via new props.
- `components/agent-ui/views/start-view.tsx` (modify) — wire config catalog + store into `WelcomeView`, seed default voice on mount.
- `components/layout/app.tsx` (modify) — pick custom token source for both deployments.

> **Test runner note:** `vitest.config.ts` only includes `lib/**/*.test.ts`. All unit tests in this plan live under `lib/`. UI components (`WelcomeView`, `StartView`) are verified by `pnpm lint` + manual check, not unit tests.

---

## Task 1: Voice catalog in app-config

**Files:**
- Modify: `app-config.ts`

- [ ] **Step 1: Add fields to the `AppConfig` interface**

In `app-config.ts`, inside `export interface AppConfig { ... }`, add after the `agentName?: string;` line (just before the `// LiveKit Cloud Sandbox configuration` block):

```ts
  // voice selection (Cartesia voice IDs)
  voices?: { id: string; label: string }[];
  defaultVoiceId?: string;
```

- [ ] **Step 2: Add the curated catalog to `APP_CONFIG_DEFAULTS`**

In the same file, inside `export const APP_CONFIG_DEFAULTS: AppConfig = { ... }`, add after the `agentName: process.env.AGENT_NAME ?? undefined,` line:

```ts
  // voice selection — Cartesia voice IDs (provided by the team)
  voices: [
    { id: 'PLACEHOLDER_CARTESIA_ID_1', label: 'Voz 1' },
    { id: 'PLACEHOLDER_CARTESIA_ID_2', label: 'Voz 2' },
  ],
  defaultVoiceId: 'PLACEHOLDER_CARTESIA_ID_1',
```

> The `PLACEHOLDER_CARTESIA_ID_*` strings and labels are filled in with the real Cartesia voice IDs supplied by the team before merge. The feature degrades cleanly if `voices` is empty (no icon rendered).

- [ ] **Step 3: Verify it compiles**

Run: `pnpm lint`
Expected: PASS (no type errors in `app-config.ts`).

- [ ] **Step 4: Commit**

```bash
git add app-config.ts
git commit -m "feat(config): add Cartesia voice catalog to app-config"
```

---

## Task 2: Voice store

**Files:**
- Create: `lib/agent-ui/voice-store.ts`
- Test: `lib/agent-ui/voice-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/agent-ui/voice-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { voiceStore } from './voice-store';

describe('voiceStore', () => {
  beforeEach(() => {
    voiceStore.setState({ voiceId: null });
  });

  it('starts with no voice selected', () => {
    expect(voiceStore.getState().voiceId).toBeNull();
  });

  it('sets the voiceId', () => {
    voiceStore.getState().setVoiceId('abc');
    expect(voiceStore.getState().voiceId).toBe('abc');
  });

  it('overwrites a previously selected voiceId', () => {
    voiceStore.getState().setVoiceId('abc');
    voiceStore.getState().setVoiceId('def');
    expect(voiceStore.getState().voiceId).toBe('def');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/agent-ui/voice-store.test.ts`
Expected: FAIL — cannot resolve `./voice-store`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/agent-ui/voice-store.ts`:

```ts
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

interface VoiceState {
  voiceId: string | null;
  setVoiceId: (id: string) => void;
}

export function createVoiceStore() {
  return createStore<VoiceState>()((set) => ({
    voiceId: null,
    setVoiceId: (id) => set({ voiceId: id }),
  }));
}

// Singleton used by the running app.
export const voiceStore = createVoiceStore();

// React hook over the singleton.
export function useVoiceStore<T>(selector: (s: VoiceState) => T): T {
  return useStore(voiceStore, selector);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/agent-ui/voice-store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/voice-store.ts lib/agent-ui/voice-store.test.ts
git commit -m "feat(voice): add voice selection store"
```

---

## Task 3: buildRoomConfig + token sources

**Files:**
- Modify: `lib/utils.ts` (header imports; `getSandboxTokenSource` near lines 98-125; add `buildRoomConfig` and `getLocalTokenSource`)
- Test: `lib/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildRoomConfig } from './utils';

describe('buildRoomConfig', () => {
  it('returns undefined when there is no agentName', () => {
    expect(buildRoomConfig(undefined, 'voice-1')).toBeUndefined();
  });

  it('omits metadata when no voice is selected', () => {
    expect(buildRoomConfig('riverside-agent', null)).toEqual({
      agents: [{ agent_name: 'riverside-agent' }],
    });
  });

  it('embeds the selected voice as JSON metadata', () => {
    expect(buildRoomConfig('riverside-agent', 'voice-1')).toEqual({
      agents: [{ agent_name: 'riverside-agent', metadata: '{"voice_id":"voice-1"}' }],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/utils.test.ts`
Expected: FAIL — `buildRoomConfig` is not exported from `./utils`.

- [ ] **Step 3: Add the imports and pure helper**

In `lib/utils.ts`, add to the import block at the top (after the existing `import type { AppConfig } from '@/app-config';` line):

```ts
import { voiceStore } from '@/lib/agent-ui/voice-store';
```

Then add this exported function above `getSandboxTokenSource` (anywhere at module scope is fine):

```ts
type AgentDispatch = { agent_name: string; metadata?: string };

/**
 * Build the LiveKit room_config agent dispatch, embedding the chosen Cartesia
 * voice as `{ voice_id }` metadata. Returns undefined when no agent is configured.
 */
export function buildRoomConfig(
  agentName: string | undefined,
  voiceId: string | null
): { agents: AgentDispatch[] } | undefined {
  if (!agentName) return undefined;
  const agent: AgentDispatch = { agent_name: agentName };
  if (voiceId) {
    agent.metadata = JSON.stringify({ voice_id: voiceId });
  }
  return { agents: [agent] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire `buildRoomConfig` into `getSandboxTokenSource`**

In `lib/utils.ts`, replace the `roomConfig` construction inside `getSandboxTokenSource` (currently lines ~102-106):

```ts
    const roomConfig = appConfig.agentName
      ? {
          agents: [{ agent_name: appConfig.agentName }],
        }
      : undefined;
```

with:

```ts
    const roomConfig = buildRoomConfig(appConfig.agentName, voiceStore.getState().voiceId);
```

- [ ] **Step 6: Add `getLocalTokenSource`**

In `lib/utils.ts`, add this exported function right after `getSandboxTokenSource`:

```ts
/**
 * Token source for the local dev `/api/token` route. Posts room_config so the
 * selected Cartesia voice reaches the agent via dispatch metadata, exactly like
 * the sandbox path.
 */
export function getLocalTokenSource(appConfig: AppConfig) {
  return TokenSource.custom(async () => {
    const roomConfig = buildRoomConfig(appConfig.agentName, voiceStore.getState().voiceId);
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_config: roomConfig }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  });
}
```

- [ ] **Step 7: Run lint + the full lib test suite**

Run: `pnpm lint && pnpm vitest run`
Expected: PASS (lint clean; all `lib/**` tests green).

- [ ] **Step 8: Commit**

```bash
git add lib/utils.ts lib/utils.test.ts
git commit -m "feat(voice): embed selected voice in room_config dispatch metadata"
```

---

## Task 4: Token source selection in App

**Files:**
- Modify: `components/layout/app.tsx:45-49`

- [ ] **Step 1: Update the import**

In `components/layout/app.tsx`, change the existing import:

```ts
import { getSandboxTokenSource } from '@/lib/utils';
```

to:

```ts
import { getLocalTokenSource, getSandboxTokenSource } from '@/lib/utils';
```

- [ ] **Step 2: Use the custom local token source**

In `components/layout/app.tsx`, replace the `tokenSource` `useMemo` (currently lines 45-49):

```ts
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : TokenSource.endpoint('/api/token');
  }, [appConfig]);
```

with:

```ts
  const tokenSource = useMemo(() => {
    return typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
      ? getSandboxTokenSource(appConfig)
      : getLocalTokenSource(appConfig);
  }, [appConfig]);
```

- [ ] **Step 3: Remove the now-unused `TokenSource` import if orphaned**

Check whether `TokenSource` is still referenced in `components/layout/app.tsx`. After Step 2 it is not, so remove it from the import line:

```ts
import { TokenSource } from 'livekit-client';
```

Delete that line.

- [ ] **Step 4: Verify it compiles**

Run: `pnpm lint`
Expected: PASS (no unused-import or type errors).

- [ ] **Step 5: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(voice): route local token source through custom room_config"
```

---

## Task 5: Voice dropdown in WelcomeView

**Files:**
- Modify: `components/layout/welcome-view.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `components/layout/welcome-view.tsx` with:

```tsx
import { MicrophoneIcon, SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Voice {
  id: string;
  label: string;
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  voices: Voice[];
  selectedVoiceId: string | null;
  onSelectVoice: (id: string) => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  voices,
  selectedVoiceId,
  onSelectVoice,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="relative z-10 flex h-full items-center justify-center p-6">
      <section className="bg-beige-50 mb-[90px] flex w-full max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center shadow-xl">
        <div className="text-foreground mb-6 flex items-center gap-4">
          <MicrophoneIcon size={22} weight="regular" />
          <SpeakerHighIcon size={22} weight="regular" />
        </div>

        <h1 className="text-foreground text-2xl font-medium">Welcome Aboard</h1>

        <p className="text-muted-foreground mt-3 max-w-prose leading-6">
          Please grant the concierge permission to use your microphone and play sound.
        </p>

        <div className="mt-7 flex items-center gap-2">
          <Button size="lg" onClick={onStartCall} className="rounded-lg px-4 py-2">
            {startButtonText}
          </Button>

          {voices.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  aria-label="Select agent voice"
                  className="rounded-lg px-3 py-2"
                >
                  <SpeakerHighIcon size={20} weight="regular" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Voice</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={selectedVoiceId ?? undefined}
                  onValueChange={onSelectVoice}
                >
                  {voices.map((voice) => (
                    <DropdownMenuRadioItem key={voice.id} value={voice.id}>
                      {voice.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </section>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: PASS. (Type errors will appear at `StartView` because it doesn't pass the new required props yet — that is fixed in Task 6. If lint fails only on `start-view.tsx`, proceed; if it fails inside `welcome-view.tsx`, fix here.)

- [ ] **Step 3: Commit**

```bash
git add components/layout/welcome-view.tsx
git commit -m "feat(voice): add voice selector dropdown to WelcomeView"
```

---

## Task 6: Wire StartView to config + store

**Files:**
- Modify: `components/agent-ui/views/start-view.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `components/agent-ui/views/start-view.tsx` with:

```tsx
'use client';

import { useEffect } from 'react';
import { useSessionContext } from '@livekit/components-react';
import { useAppConfig } from '@/components/layout/app-config-context';
import { WelcomeView } from '@/components/layout/welcome-view';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import { useVoiceStore } from '@/lib/agent-ui/voice-store';

export function StartView() {
  const { start } = useSessionContext();
  const setView = useSetViewFromUser();
  const config = useAppConfig();

  const voices = config.voices ?? [];
  const voiceId = useVoiceStore((s) => s.voiceId);
  const setVoiceId = useVoiceStore((s) => s.setVoiceId);

  // Seed the store with the configured default the first time we render with a
  // catalog but no selection yet, so the default voice is sent as metadata even
  // if the user never opens the dropdown.
  useEffect(() => {
    if (voiceId === null && config.defaultVoiceId) {
      setVoiceId(config.defaultVoiceId);
    }
  }, [voiceId, config.defaultVoiceId, setVoiceId]);

  const handleStart = () => {
    setView({ type: 'presentation' });
    start();
  };

  return (
    <WelcomeView
      startButtonText={config.startButtonText}
      onStartCall={handleStart}
      voices={voices}
      selectedVoiceId={voiceId}
      onSelectVoice={setVoiceId}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: PASS (no type errors; `WelcomeView` now receives all required props).

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/views/start-view.tsx
git commit -m "feat(voice): wire StartView voice selection to store and config"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: PASS, no warnings/errors.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS — includes `voice-store.test.ts` (3) and `utils.test.ts` (3) plus pre-existing `lib/**` tests, all green.

- [ ] **Step 3: Manual smoke check (optional, local)**

Run the app (`pnpm dev`), open the welcome screen, confirm: the voice icon appears next to "Start the experience"; clicking it lists the configured voices with the default checked; selecting a voice then Start sends `room_config.agents[0].metadata = '{"voice_id":"<id>"}'` (verify in the Network request to `/api/token`).

> Backend dependency: the agent must read `ctx.job.metadata` and configure Cartesia accordingly. Without that change the call still works and uses the agent's default voice.

---

## Backend dependency (out of scope, separate repo)

The LiveKit agent must, at session start, read its dispatch metadata (`ctx.job.metadata`), parse `{ "voice_id": "..." }`, and set the Cartesia TTS voice to that ID. Absent or unparseable metadata → keep the default voice. Coordinate this with the backend team; the frontend is complete and degrades cleanly without it.
