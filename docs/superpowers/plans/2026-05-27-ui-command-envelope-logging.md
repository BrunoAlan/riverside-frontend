# UI Command Envelope Logging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move UI command envelope reception into `lib/agent-ui/transport.ts` so envelopes arrive from the LiveKit data channel and are logged to the browser console. No schema or view changes.

**Architecture:** Replace the existing text-stream handler in `transport.ts` with a `RoomEvent.DataReceived` listener filtered to topic `ui-commands`. Decode `Uint8Array` → `JSON.parse`, then log the envelope and each command. Delete the throwaway `debug-transport.ts` and the obsolete transport tests. Store, views, and `commands.ts` are untouched.

**Tech Stack:** Next.js + React 19, TypeScript, `livekit-client`, `@livekit/components-react`, pnpm, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-27-ui-command-envelope-logging-design.md`

---

## File Structure

- **Modify** `lib/agent-ui/transport.ts` — rewritten as a data-channel listener that logs envelopes. Sole export: `useUiCommandTransport`.
- **Delete** `lib/agent-ui/debug-transport.ts` — its job moves into `transport.ts`.
- **Modify** `components/layout/app.tsx` — drop the `useDebugUiTransport()` hook call and its import.
- **Delete** `lib/agent-ui/transport.test.ts` — tests the removed `handleUiCommandStream`; will be reintroduced when `applyCommand` is rewired in a future iteration.

`lib/agent-ui/commands.ts`, `ui-view-store.ts`, `ui-view-types.ts`, `hooks.ts`, `view-registry.ts`, and all view components stay as-is.

---

## Task 1: Rewrite transport.ts to log envelopes from the data channel

**Files:**
- Modify: `lib/agent-ui/transport.ts` (full rewrite)

- [ ] **Step 1: Replace file contents**

Replace the entire content of `lib/agent-ui/transport.ts` with:

```ts
'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';

const TOPIC = 'ui-commands';

interface EnvelopeLike {
  correlationId?: unknown;
  sessionId?: unknown;
  timestamp?: unknown;
  commands?: unknown;
}

export function useUiCommandTransport(): void {
  const room = useMaybeRoomContext();
  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic !== TOPIC) return;

      let text: string;
      try {
        text = new TextDecoder().decode(payload);
      } catch (e) {
        console.warn('[ui-commands] decode error', e);
        return;
      }

      let envelope: EnvelopeLike;
      try {
        envelope = JSON.parse(text) as EnvelopeLike;
      } catch (e) {
        console.warn('[ui-commands] JSON parse error', { error: e, text });
        return;
      }

      const commands = Array.isArray(envelope.commands) ? envelope.commands : [];
      const correlationId =
        typeof envelope.correlationId === 'string' ? envelope.correlationId : undefined;

      if (commands.length === 0) {
        console.debug('[ui-commands] empty envelope', { correlationId });
        return;
      }

      console.log('[ui-commands] envelope', {
        correlationId,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestamp,
        count: commands.length,
      });

      for (const command of commands) {
        const c = command as { type?: unknown; correlationId?: unknown; payload?: unknown };
        console.log('[ui-commands] command', {
          type: c.type,
          correlationId: c.correlationId,
          payload: c.payload,
        });
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
```

Notes for the engineer:
- The text-stream API (`registerTextStreamHandler`) is gone — backend now uses `publish_data`.
- We deliberately don't validate against the `UiCommand` Zod schema in `commands.ts` because the live envelope shape (camelCase, batch wrapper, new `show_welcome_canvas` type) doesn't match it yet. That alignment is a follow-up.
- `useMaybeRoomContext` returns `Room | undefined`; guarding with `if (!room) return` is essential because the hook mounts before the room connects.

- [ ] **Step 2: Run lint to verify the file is clean**

Run: `pnpm lint`
Expected: exits 0. No new warnings/errors from `lib/agent-ui/transport.ts`.

- [ ] **Step 3: Run typecheck-via-tests to verify nothing else broke**

Run: `pnpm test`
Expected: the suite that used to import from `transport.ts` (`lib/agent-ui/transport.test.ts`) will FAIL — that's expected; it's removed in Task 3. All other tests pass. If anything else fails, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add lib/agent-ui/transport.ts
git commit -m "refactor(agent-ui): consume ui-commands from data channel and log"
```

---

## Task 2: Remove debug-transport.ts and its mount

**Files:**
- Delete: `lib/agent-ui/debug-transport.ts`
- Modify: `components/layout/app.tsx` (drop import + hook call)

- [ ] **Step 1: Delete the debug transport file**

Run: `rm lib/agent-ui/debug-transport.ts`

- [ ] **Step 2: Edit `components/layout/app.tsx`**

Find this block near the top of the file (around lines 15-18):

```ts
import { useDebugMode } from '@/hooks/use-debug';
import { useDebugUiTransport } from '@/lib/agent-ui/debug-transport';
import { useUiView } from '@/lib/agent-ui/hooks';
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
```

Remove the `useDebugUiTransport` import line so it becomes:

```ts
import { useDebugMode } from '@/hooks/use-debug';
import { useUiView } from '@/lib/agent-ui/hooks';
import { useUiCommandTransport } from '@/lib/agent-ui/transport';
```

Then find this block (around the `AppSetup` function):

```ts
function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  useDebugUiTransport();
  return null;
}
```

Remove the `useDebugUiTransport();` line so it becomes:

```ts
function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();
  useUiCommandTransport();
  return null;
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: exits 0. No "unused import" or "unresolved module" errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agent-ui/debug-transport.ts components/layout/app.tsx
git commit -m "chore(agent-ui): remove temporary debug-transport"
```

---

## Task 3: Delete the obsolete transport tests

**Files:**
- Delete: `lib/agent-ui/transport.test.ts`

- [ ] **Step 1: Delete the test file**

Run: `rm lib/agent-ui/transport.test.ts`

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: exits 0. All remaining tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/transport.test.ts
git commit -m "test(agent-ui): drop transport tests pending applyCommand rewire"
```

(The `git add` of a deleted file stages the deletion — that's the intended behavior.)

---

## Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run lint and tests together**

Run: `pnpm lint && pnpm test`
Expected: both exit 0.

- [ ] **Step 2: Manual smoke (browser)**

Run: `pnpm dev`
Open the app, click the start button so the LiveKit session connects, exercise the agent until it emits at least one UI command (e.g. the welcome canvas appears in the agent logs).

Open browser DevTools → Console. Expected log lines:
- `[ui-commands] envelope { correlationId, sessionId, timestamp, count }` when a non-empty envelope arrives.
- `[ui-commands] command { type, correlationId, payload }` once per command.
- `[ui-commands] empty envelope { correlationId }` for heartbeat envelopes with `commands: []`.

If no log lines appear, check:
- `topic` field in `RoomEvent.DataReceived` — confirm the backend is still publishing on `ui-commands`.
- The room is actually connected (`PCTransportManager` "start negotiating" line in console).

- [ ] **Step 3: Confirm done**

No commit at this step — verification only. If everything checks out, the plan is complete.

---

## Self-Review Notes

- **Spec coverage:** All four file-level changes in the spec (rewrite transport.ts, delete debug-transport.ts, edit app.tsx, delete transport.test.ts) are covered by Tasks 1–3. Final verification covers the lint+test+manual smoke gates required by `AGENTS.MD`.
- **No placeholders:** Every code block is concrete and copy-paste ready.
- **Type consistency:** `EnvelopeLike` is defined and used only inside `transport.ts`. The exported surface is just `useUiCommandTransport()` (matching `components/layout/app.tsx`'s existing import).
- **Tradeoff acknowledged:** Between Task 1 and Task 3, `pnpm test` will fail on `transport.test.ts` because it still imports the removed `handleUiCommandStream`. This is intentional; Task 3 cleans it up. The Task 1 verification step calls this out explicitly so the executor doesn't get spooked.
