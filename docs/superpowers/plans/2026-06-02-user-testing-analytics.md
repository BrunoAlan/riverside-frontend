# User Testing Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blocking identity gate plus PostHog analytics (events + session replay) so every user-testing session is identified and measurable, with zero custom backend or dashboards.

**Architecture:** A `PostHogProvider` initializes `posthog-js` once; an `IdentityGate` blocks `/agent` until a tester declares name + email (stored in `localStorage`) and is `identify()`-ed. Two client hooks emit session/error/view events from existing LiveKit + `uiViewStore` state. The tester email is threaded into the LiveKit token as the participant identity. All analysis lives in PostHog.

**Tech Stack:** Next.js 15 (App Router), React 19, `posthog-js`, Zustand, LiveKit, vitest (node env).

---

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `lib/analytics/events.ts` | Event-name constants + payload types (the wire contract) | Create |
| `lib/analytics/identity.ts` | Read/write tester identity in `localStorage` | Create |
| `lib/analytics/duration.ts` | Pure `computeDurationSeconds` helper | Create |
| `lib/analytics/posthog.ts` | `posthog-js` init + typed helpers; no-op without key | Create |
| `components/analytics/posthog-provider.tsx` | Init PostHog once, render children | Create |
| `components/analytics/identity-gate.tsx` | Blocking name+email form; identify on submit | Create |
| `hooks/use-session-analytics.ts` | Emit `session_started`/`session_ended`/`agent_error` | Create |
| `hooks/use-view-analytics.ts` | Emit `agent_view_shown` on view change | Create |
| `components/layout/app.tsx` | Call the two analytics hooks in `AppSetup` | Modify |
| `app/agent/page.tsx` | Wrap `App` with provider + gate | Modify |
| `lib/utils.ts` | Send tester identity in token-source body | Modify |
| `app/api/token/route.ts` | Use tester identity for the LiveKit participant | Modify |
| `.env.example` | Document the two `NEXT_PUBLIC_POSTHOG_*` vars | Modify |

Test files (must live under `lib/**` to be picked up by `vitest.config.ts`):
`lib/analytics/identity.test.ts`, `lib/analytics/duration.test.ts`, `lib/analytics/posthog.test.ts`.

---

## Task 1: Install dependency and document env

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `.env.example`

- [ ] **Step 1: Add posthog-js**

Run: `pnpm add posthog-js`
Expected: `posthog-js` appears under `dependencies` in `package.json`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Append analytics vars to `.env.example`**

Add these lines to `.env.example`:

```env

# Analytics (PostHog). Leave blank to disable analytics entirely (no-op).
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore(analytics): add posthog-js dependency and env vars"
```

---

## Task 2: Event contract module

**Files:**
- Create: `lib/analytics/events.ts`

No dedicated test — these are constants/types, exercised by `posthog.test.ts` in Task 5.

- [ ] **Step 1: Create `lib/analytics/events.ts`**

```ts
// Analytics event names and their payload shapes. The single source of truth
// for what we send to PostHog. Keep names stable — PostHog insights key off them.

export const ANALYTICS_EVENTS = {
  testerIdentified: 'tester_identified',
  sessionStarted: 'session_started',
  sessionEnded: 'session_ended',
  agentError: 'agent_error',
  agentViewShown: 'agent_view_shown',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventProps = {
  [ANALYTICS_EVENTS.testerIdentified]: { name: string; email: string };
  [ANALYTICS_EVENTS.sessionStarted]: { voice_id: string | null };
  [ANALYTICS_EVENTS.sessionEnded]: { duration_seconds: number; voice_id: string | null };
  [ANALYTICS_EVENTS.agentError]: { reasons: string[]; duration_seconds: number };
  [ANALYTICS_EVENTS.agentViewShown]: { view_type: string };
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS (no unused/type errors from the new file).

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/events.ts
git commit -m "feat(analytics): define event contract"
```

---

## Task 3: Tester identity store (TDD)

**Files:**
- Create: `lib/analytics/identity.ts`
- Test: `lib/analytics/identity.test.ts`

The vitest env is `node` — there is no `localStorage`. The test installs an
in-memory stub via `vi.stubGlobal`.

- [ ] **Step 1: Write the failing test**

Create `lib/analytics/identity.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readIdentity, writeIdentity } from './identity';

function installLocalStorageStub() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => void data.clear(),
  });
  return data;
}

describe('identity store', () => {
  let data: Map<string, string>;

  beforeEach(() => {
    data = installLocalStorageStub();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a written identity', () => {
    writeIdentity({ name: 'Ada', email: 'ada@example.com' });
    expect(readIdentity()).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('returns null when nothing is stored', () => {
    expect(readIdentity()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    data.set('riverside.tester-identity', '{not json');
    expect(readIdentity()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    data.set('riverside.tester-identity', JSON.stringify({ name: 'Ada' }));
    expect(readIdentity()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- identity`
Expected: FAIL — cannot import `readIdentity`/`writeIdentity` (module missing).

- [ ] **Step 3: Write minimal implementation**

Create `lib/analytics/identity.ts`:

```ts
export type TesterIdentity = { name: string; email: string };

const STORAGE_KEY = 'riverside.tester-identity';

export function readIdentity(): TesterIdentity | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as TesterIdentity).name === 'string' &&
      typeof (parsed as TesterIdentity).email === 'string'
    ) {
      return { name: (parsed as TesterIdentity).name, email: (parsed as TesterIdentity).email };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeIdentity(identity: TesterIdentity): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- identity`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/identity.ts lib/analytics/identity.test.ts
git commit -m "feat(analytics): tester identity localStorage store"
```

---

## Task 4: Duration helper (TDD)

**Files:**
- Create: `lib/analytics/duration.ts`
- Test: `lib/analytics/duration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/analytics/duration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeDurationSeconds } from './duration';

describe('computeDurationSeconds', () => {
  it('rounds milliseconds to whole seconds', () => {
    expect(computeDurationSeconds(1_000, 6_400)).toBe(5);
  });

  it('returns 0 for equal timestamps', () => {
    expect(computeDurationSeconds(5_000, 5_000)).toBe(0);
  });

  it('never returns negative when end precedes start', () => {
    expect(computeDurationSeconds(10_000, 5_000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- duration`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Create `lib/analytics/duration.ts`:

```ts
// Pure so it is unit-testable without a clock. Callers pass Date.now() values.
export function computeDurationSeconds(startMs: number, endMs: number): number {
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- duration`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/duration.ts lib/analytics/duration.test.ts
git commit -m "feat(analytics): pure session duration helper"
```

---

## Task 5: PostHog wrapper (TDD)

**Files:**
- Create: `lib/analytics/posthog.ts`
- Test: `lib/analytics/posthog.test.ts`

The wrapper must no-op without a key, and forward to `posthog-js` when
initialized. The test mocks `posthog-js` and stubs env + `window`. A
`resetAnalyticsForTests()` seam clears the module-level `initialized` flag
between tests.

- [ ] **Step 1: Write the failing test**

Create `lib/analytics/posthog.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPosthog = {
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
};

vi.mock('posthog-js', () => ({ default: mockPosthog }));

import {
  captureEvent,
  identifyTester,
  initPostHog,
  resetAnalyticsForTests,
} from './posthog';

describe('posthog wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAnalyticsForTests();
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not init or capture without a key', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    initPostHog();
    captureEvent('session_started', { voice_id: null });
    identifyTester('a@b.com', 'Ada');
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });

  it('inits with the key and forwards events when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
    expect(mockPosthog.init).toHaveBeenCalledWith('phc_test', expect.any(Object));

    captureEvent('session_started', { voice_id: 'voice-1' });
    expect(mockPosthog.capture).toHaveBeenCalledWith('session_started', { voice_id: 'voice-1' });

    identifyTester('ada@b.com', 'Ada');
    expect(mockPosthog.identify).toHaveBeenCalledWith('ada@b.com', {
      name: 'Ada',
      email: 'ada@b.com',
    });
  });

  it('inits at most once', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    initPostHog();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
  });

  it('does not init in local dev even with a key', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    captureEvent('session_started', { voice_id: null });
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- posthog`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Create `lib/analytics/posthog.ts`:

```ts
import posthog from 'posthog-js';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

let initialized = false;

const DEFAULT_HOST = 'https://us.i.posthog.com';

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  // Never track in local dev (`next dev` sets NODE_ENV='development'). Using
  // `=== 'development'` (not `!== 'production'`) keeps vitest (NODE_ENV='test')
  // able to exercise the wrapper.
  if (process.env.NODE_ENV === 'development') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
    autocapture: true,
    capture_pageview: true,
    // Screen recording for user-testing sessions. Input text is masked by
    // default, so the name/email typed into the gate is never recorded.
    disable_session_recording: false,
    person_profiles: 'always',
  });
  initialized = true;
}

export function identifyTester(email: string, name: string): void {
  if (!initialized) return;
  posthog.identify(email, { name, email });
}

export function captureEvent<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsEventProps[E]
): void {
  if (!initialized) return;
  posthog.capture(event, props);
}

// Test-only seam: reset the module-level init flag between tests.
export function resetAnalyticsForTests(): void {
  initialized = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- posthog`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/posthog.ts lib/analytics/posthog.test.ts
git commit -m "feat(analytics): posthog wrapper with no-op fallback"
```

---

## Task 6: PostHog provider component

**Files:**
- Create: `components/analytics/posthog-provider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
'use client';

import { useEffect } from 'react';
import { initPostHog } from '@/lib/analytics/posthog';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/posthog-provider.tsx
git commit -m "feat(analytics): posthog provider"
```

---

## Task 7: Identity gate component

**Files:**
- Create: `components/analytics/identity-gate.tsx`

Uses existing primitives `Card` (`@/components/ui/card`), `Input`
(`@/components/ui/input`), `Label` (`@/components/ui/label`), `Button`
(`@/components/ui/button`). Styling mirrors `WelcomeView` (beige card, centered).

- [ ] **Step 1: Create the gate**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { readIdentity, writeIdentity } from '@/lib/analytics/identity';
import { captureEvent, identifyTester } from '@/lib/analytics/posthog';

interface IdentityGateProps {
  children: React.ReactNode;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function IdentityGate({ children }: IdentityGateProps) {
  // null = not yet read (avoid hydration flash); false = needs form; true = ready.
  const [ready, setReady] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const existing = readIdentity();
    if (existing) {
      identifyTester(existing.email, existing.name);
      setReady(true);
    } else {
      setReady(false);
    }
  }, []);

  if (ready === null) return null;
  if (ready) return <>{children}</>;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const valid = trimmedName.length > 0 && EMAIL_RE.test(trimmedEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const identity = { name: trimmedName, email: trimmedEmail };
    writeIdentity(identity);
    identifyTester(identity.email, identity.name);
    captureEvent(ANALYTICS_EVENTS.testerIdentified, identity);
    setReady(true);
  };

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <Card className="bg-beige-50 flex w-full max-w-md flex-col gap-5 rounded-2xl px-8 py-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-foreground text-2xl font-medium">Welcome</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Antes de empezar, contanos quién sos. Esta sesión se graba con fines de prueba.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tester-name">Nombre</Label>
            <Input
              id="tester-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tester-email">Email</Label>
            <Input
              id="tester-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={!valid} className="mt-2 rounded-lg">
            Empezar
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/identity-gate.tsx
git commit -m "feat(analytics): blocking identity gate"
```

---

## Task 8: Session analytics hook

**Files:**
- Create: `hooks/use-session-analytics.ts`

Emits session/error events from LiveKit state. Mirrors how `useAgentErrors`
reads `useAgent()` + `useSessionContext()`. `voice_id` comes from the existing
vanilla `voiceStore`.

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useRef } from 'react';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { computeDurationSeconds } from '@/lib/analytics/duration';
import { captureEvent } from '@/lib/analytics/posthog';
import { voiceStore } from '@/lib/agent-ui/voice-store';

export function useSessionAnalytics() {
  const agent = useAgent();
  const { isConnected } = useSessionContext();
  const startMsRef = useRef<number | null>(null);
  const wasConnectedRef = useRef(false);
  const erroredRef = useRef(false);

  // session_started / session_ended on connection transitions.
  useEffect(() => {
    const voiceId = voiceStore.getState().voiceId;
    if (isConnected && !wasConnectedRef.current) {
      wasConnectedRef.current = true;
      erroredRef.current = false;
      startMsRef.current = Date.now();
      captureEvent(ANALYTICS_EVENTS.sessionStarted, { voice_id: voiceId });
    } else if (!isConnected && wasConnectedRef.current) {
      wasConnectedRef.current = false;
      const start = startMsRef.current ?? Date.now();
      captureEvent(ANALYTICS_EVENTS.sessionEnded, {
        duration_seconds: computeDurationSeconds(start, Date.now()),
        voice_id: voiceId,
      });
      startMsRef.current = null;
    }
  }, [isConnected]);

  // agent_error when the agent reports a failure during a connected session.
  useEffect(() => {
    if (isConnected && agent.state === 'failed' && !erroredRef.current) {
      erroredRef.current = true;
      const start = startMsRef.current ?? Date.now();
      captureEvent(ANALYTICS_EVENTS.agentError, {
        reasons: agent.failureReasons ?? [],
        duration_seconds: computeDurationSeconds(start, Date.now()),
      });
    }
  }, [isConnected, agent.state, agent.failureReasons]);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS. (If `agent.failureReasons` typing differs, match the shape used in `hooks/use-agent-errors.tsx` — `agent.failureReasons` is `string[]`.)

- [ ] **Step 3: Commit**

```bash
git add hooks/use-session-analytics.ts
git commit -m "feat(analytics): session + error events hook"
```

---

## Task 9: View analytics hook

**Files:**
- Create: `hooks/use-view-analytics.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect } from 'react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';
import { useUiView } from '@/lib/agent-ui/hooks';

export function useViewAnalytics() {
  const view = useUiView();

  useEffect(() => {
    captureEvent(ANALYTICS_EVENTS.agentViewShown, { view_type: view.type });
  }, [view.type]);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-view-analytics.ts
git commit -m "feat(analytics): agent view shown hook"
```

---

## Task 10: Wire hooks into AppSetup

**Files:**
- Modify: `components/layout/app.tsx`

- [ ] **Step 1: Import and call the hooks in `AppSetup`**

In `components/layout/app.tsx`, add imports near the other hook imports:

```tsx
import { useSessionAnalytics } from '@/hooks/use-session-analytics';
import { useViewAnalytics } from '@/hooks/use-view-analytics';
```

Then update `AppSetup` (currently lines 23-28) to call them alongside the
existing hooks:

```tsx
function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  useSessionAnalytics();
  useViewAnalytics();
  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(analytics): emit session and view events from AppSetup"
```

---

## Task 11: Mount provider and gate around the app

**Files:**
- Modify: `app/agent/page.tsx`

- [ ] **Step 1: Wrap `App`**

Replace the contents of `app/agent/page.tsx` with:

```tsx
import { headers } from 'next/headers';
import { IdentityGate } from '@/components/analytics/identity-gate';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { App } from '@/components/layout/app';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return (
    <PostHogProvider>
      <IdentityGate>
        <App appConfig={appConfig} />
      </IdentityGate>
    </PostHogProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/agent/page.tsx
git commit -m "feat(analytics): gate /agent behind identity + posthog"
```

---

## Task 12: Thread tester identity into the LiveKit token

**Files:**
- Modify: `lib/utils.ts`
- Modify: `app/api/token/route.ts`

The token-source callbacks run in the browser, so they can read the identity
from `localStorage` and send it. The token route uses it for the participant
identity/name, falling back to today's random values when absent.

- [ ] **Step 1: Send identity from the local token source**

In `lib/utils.ts`, add an import at the top:

```ts
import { readIdentity } from '@/lib/analytics/identity';
```

In `getLocalTokenSource`, build a participant payload and include it in the body:

```ts
export function getLocalTokenSource(appConfig: AppConfig) {
  return TokenSource.custom(async () => {
    const roomConfig = buildRoomConfig(appConfig.agentName, voiceStore.getState().voiceId);
    const tester = readIdentity();
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_config: roomConfig,
          participant: tester ? { identity: tester.email, name: tester.name } : undefined,
        }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  });
}
```

Apply the same `const tester = readIdentity();` + `participant` field to
`getSandboxTokenSource`'s body (the sandbox endpoint may ignore it; harmless).

- [ ] **Step 2: Use the identity in the token route**

In `app/api/token/route.ts`, replace the fixed participant block:

```ts
    // Parse room config from request body.
    const body = await req.json();
    const roomConfig = body?.room_config
      ? RoomConfiguration.fromJson(body.room_config, { ignoreUnknownFields: true })
      : new RoomConfiguration();

    // Identify the participant by the tester's declared identity when present,
    // so LiveKit sessions correlate to the tester; fall back to a random id.
    const tester = body?.participant as { identity?: string; name?: string } | undefined;
    const participantName = tester?.name?.trim() || 'user';
    const participantIdentity =
      tester?.identity?.trim() || `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;
```

(The rest of the function — `createParticipantToken(...)` and the response — is unchanged.)

- [ ] **Step 3: Typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/utils.ts app/api/token/route.ts
git commit -m "feat(analytics): use tester identity as livekit participant"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the test suite**

Run: `pnpm test`
Expected: PASS — all existing tests plus the 3 new analytics test files (identity, duration, posthog).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS, no warnings on new files.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: build succeeds (server page composing client `PostHogProvider`/`IdentityGate` around `App` compiles; no serialization errors since only `appConfig` crosses the server→client boundary).

- [ ] **Step 4: Manual smoke (optional)**

Run `pnpm dev`, open `/agent`: the gate blocks until name+email submitted; after
submit the welcome view appears. **In local dev, tracking is intentionally off**
— `initPostHog()` returns early on `NODE_ENV === 'development'`, so no events or
recording are sent even with a key set. To verify real tracking, build and run
the production output (`pnpm build && pnpm start`) with `NEXT_PUBLIC_POSTHOG_KEY`
set: PostHog "Activity" then shows `tester_identified`, `session_started`, and
`agent_view_shown`.

---

## Notes for the implementer

- **No `app-config.ts` changes.** Analytics is wired via env + its own module.
- **Do not hand-edit `components/ui/`.** Reuse `Card`/`Input`/`Label`/`Button` as-is.
- **Test placement matters:** `vitest.config.ts` only includes `lib/**/*.test.ts`. Keep all tests under `lib/analytics/`. The env is `node`, so stub `localStorage`/`window`/`posthog-js` as shown — do not assume a DOM.
- **Run `pnpm lint` and `pnpm test` before any push/merge** (hard rule in `AGENTS.MD`).
