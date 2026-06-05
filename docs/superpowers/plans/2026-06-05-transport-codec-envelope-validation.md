# Transport codec + envelope validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share one wire codec across the agent-UI transport and validate the inbound envelope at the seam so envelope-level failures surface in the dev event panel.

**Architecture:** A new `wire.ts` holds module-level `TextEncoder`/`TextDecoder` instances and two helpers (`encodeJson`, `decodeText`), replacing per-message allocations in `transport.ts` and `frontend-intent.ts`. A permissive Zod `Envelope` schema added to `commands.ts` lets `dispatchEnvelope` reject malformed envelopes with a recorded `envelope-error` event instead of silently dropping them. Same pass also documents each function and renames non-meaningful locals.

**Tech Stack:** TypeScript (strict), Zod, Vitest, LiveKit data channel, zustand dev event log.

**Spec:** `docs/superpowers/specs/2026-06-05-transport-codec-envelope-validation-design.md`

---

## File Structure

- **Create** `lib/agent-ui/wire.ts` — shared JSON wire codec (`encodeJson`, `decodeText`).
- **Create** `lib/agent-ui/wire.test.ts` — codec round-trip test.
- **Modify** `lib/agent-ui/commands.ts` — add `Envelope` schema + type.
- **Modify** `lib/agent-ui/transport.ts` — validate envelope, use `decodeText`, rename locals, document functions, drop `EnvelopeLike`.
- **Modify** `lib/agent-ui/transport.test.ts` — add `envelope-error` test.
- **Modify** `lib/agent-ui/frontend-intent.ts` — use `encodeJson`.

---

## Task 1: Shared wire codec

**Files:**
- Create: `lib/agent-ui/wire.ts`
- Test: `lib/agent-ui/wire.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/agent-ui/wire.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decodeText, encodeJson } from './wire';

describe('wire codec', () => {
  it('round-trips a value through encodeJson and decodeText', () => {
    const value = { correlationId: 'env-1', commands: [{ type: 'show_discovery_canvas' }] };
    const bytes = encodeJson(value);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(JSON.parse(decodeText(bytes))).toEqual(value);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/wire.test.ts`
Expected: FAIL — `Cannot find module './wire'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/agent-ui/wire.ts`:

```ts
// Shared JSON wire codec for the LiveKit data channel. The encoder/decoder are
// allocated once at module load and reused for every message, instead of a new
// instance per call.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Serialize a value to UTF-8 JSON bytes for publishing on a data-channel topic.
export const encodeJson = (value: unknown): Uint8Array => encoder.encode(JSON.stringify(value));

// Decode UTF-8 bytes received on a data-channel topic into a string. The caller
// JSON-parses separately, so decode failures and parse failures stay distinct.
export const decodeText = (bytes: Uint8Array): string => decoder.decode(bytes);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run lib/agent-ui/wire.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/wire.ts lib/agent-ui/wire.test.ts
git commit -m "feat(agent-ui): add shared wire codec (encodeJson/decodeText)"
```

---

## Task 2: Envelope schema

**Files:**
- Modify: `lib/agent-ui/commands.ts:177-190` (append after the `UiCommand` export)

- [ ] **Step 1: Add the `Envelope` schema**

At the end of `lib/agent-ui/commands.ts`, after the `UiCommand` export (currently ends at line 190), append:

```ts

// The data-channel envelope that wraps a batch of UI commands. Permissive by
// design: it only guarantees `commands` is an array (defaulting to empty), so a
// malformed envelope can be recorded as an error rather than silently dropped.
export const Envelope = z.object({
  correlationId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  commands: z.array(z.unknown()).default([]),
});
export type Envelope = z.infer<typeof Envelope>;
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/commands.ts
git commit -m "feat(agent-ui): add permissive Envelope schema"
```

---

## Task 3: Validate envelope + codec wire-up + cleanup in transport

**Files:**
- Modify: `lib/agent-ui/transport.test.ts` (add a test in the existing `dispatchEnvelope dev event logging` describe block)
- Modify: `lib/agent-ui/transport.ts` (whole file)

- [ ] **Step 1: Write the failing test**

In `lib/agent-ui/transport.test.ts`, inside the `describe('dispatchEnvelope dev event logging', …)` block (after the existing `records a parse error event` test, before its closing `});`), add:

```ts
  it('records an envelope-error for a malformed envelope', () => {
    const store = createUiViewStore();
    dispatchEnvelope({ correlationId: 'env-bad', commands: 'not-an-array' }, store.getState());
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'ui-commands',
      label: 'envelope-error',
      ok: false,
    });
    expect(store.getState().view).toEqual({ type: 'start' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run lib/agent-ui/transport.test.ts -t "records an envelope-error"`
Expected: FAIL — no event recorded (length 0) because `dispatchEnvelope` currently treats `commands: 'not-an-array'` as an empty list and records nothing.

- [ ] **Step 3: Rewrite `transport.ts`**

Replace the entire contents of `lib/agent-ui/transport.ts` with:

```ts
'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { recordDevEvent } from '../dev/record-dev-event';
import { Envelope, UiCommand } from './commands';
import { uiViewStore } from './ui-view-store';
import { decodeText } from './wire';

const TOPIC = 'ui-commands';

type Store = Pick<ReturnType<typeof uiViewStore.getState>, 'applyCommand' | 'recordParseError'>;

// Validate the inbound envelope, then parse and apply each command in order.
// Failures are recorded to the dev event log, never thrown: a malformed envelope
// yields one `envelope-error` event; a malformed command yields one
// `parse-error` event and is skipped.
export function dispatchEnvelope(envelope: unknown, store: Store): void {
  const parsed = Envelope.safeParse(envelope);
  if (!parsed.success) {
    recordDevEvent({
      channel: 'ui-commands',
      label: 'envelope-error',
      ok: false,
      payload: envelope,
    });
    return;
  }

  for (const rawCommand of parsed.data.commands) {
    const result = UiCommand.safeParse(rawCommand);
    if (result.success) {
      store.applyCommand(result.data);
      recordDevEvent({
        channel: 'ui-commands',
        label: result.data.type,
        correlationId: result.data.correlationId,
        ok: true,
        payload: result.data,
        envelope,
      });
    } else {
      const rawId = (rawCommand as { correlationId?: unknown }).correlationId;
      const correlationId = typeof rawId === 'string' ? rawId : undefined;
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      store.recordParseError({ correlationId, message });
      recordDevEvent({
        channel: 'ui-commands',
        label: 'parse-error',
        correlationId,
        ok: false,
        payload: rawCommand,
        envelope,
      });
    }
  }
}

// Subscribe the current LiveKit room to `ui-commands` data messages and feed each
// decoded envelope to `dispatchEnvelope`. Decode and JSON-parse failures (before
// an envelope object exists) are recorded to the dev event log.
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
        text = decodeText(payload);
      } catch (err) {
        recordDevEvent({
          channel: 'ui-commands',
          label: 'decode-error',
          ok: false,
          payload: String(err),
        });
        return;
      }

      let envelope: unknown;
      try {
        envelope = JSON.parse(text);
      } catch (err) {
        recordDevEvent({
          channel: 'ui-commands',
          label: 'json-error',
          ok: false,
          payload: { error: String(err), text },
        });
        return;
      }

      dispatchEnvelope(envelope, uiViewStore.getState());
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
```

Key changes vs. the previous file: `EnvelopeLike` interface removed; `dispatchEnvelope` takes `unknown` and validates via `Envelope.safeParse`; `decodeText` replaces `new TextDecoder().decode(...)`; locals renamed (`raw`→`rawCommand`, the `r` cast → meaningful `rawId`, `i`→`issue`, `e`→`err`); both functions documented.

- [ ] **Step 4: Run the new test to verify it passes**

Run: `pnpm exec vitest run lib/agent-ui/transport.test.ts -t "records an envelope-error"`
Expected: PASS.

- [ ] **Step 5: Run the full transport test file (no regressions)**

Run: `pnpm exec vitest run lib/agent-ui/transport.test.ts`
Expected: PASS — all existing tests still green, including "does not throw when commands is missing or not an array" (missing `commands` defaults to `[]`; `commands: 'not-an-array'` no longer throws and now also records an event, which that test does not assert against).

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/transport.ts lib/agent-ui/transport.test.ts
git commit -m "refactor(agent-ui): validate envelope at transport seam, share codec, tidy names"
```

---

## Task 4: Use shared codec in frontend-intent

**Files:**
- Modify: `lib/agent-ui/frontend-intent.ts:1-2` (imports) and `:38` (encode call)

- [ ] **Step 1: Add the import**

In `lib/agent-ui/frontend-intent.ts`, after the existing imports (currently lines 1-2), add the codec import so the import block reads:

```ts
import type { LocalParticipant } from 'livekit-client';
import { recordDevEvent } from '../dev/record-dev-event';
import { encodeJson } from './wire';
```

- [ ] **Step 2: Replace the inline encode**

Change line 38 from:

```ts
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
```

to:

```ts
  const bytes = encodeJson(envelope);
```

- [ ] **Step 3: Run the frontend-intent tests**

Run: `pnpm exec vitest run lib/agent-ui/frontend-intent.test.ts`
Expected: PASS (if the file exists). If there is no such test file, instead run `pnpm lint` and expect no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agent-ui/frontend-intent.ts
git commit -m "refactor(agent-ui): publish frontend-intent via shared codec"
```

---

## Task 5: Full verification

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `pnpm test`
Expected: all test files pass (previous baseline: 134 tests; now +2 — `wire` round-trip and `envelope-error`).

- [ ] **Step 3: Confirm no stray codec allocations or `EnvelopeLike` left**

Run: `grep -rn "new TextDecoder\|new TextEncoder\|EnvelopeLike" lib/agent-ui/`
Expected: only `lib/agent-ui/wire.ts` matches (the two module-level instances). No `EnvelopeLike`.
