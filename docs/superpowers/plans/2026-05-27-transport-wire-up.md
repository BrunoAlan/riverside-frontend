# Transport Wire-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `transport.ts` actually dispatch parsed `UiCommand`s into `uiViewStore`, so a live agent session can move the UI; migrate envelope-level fields (`correlationId`, `sessionId`) from snake_case to camelCase to match the wire.

**Architecture:** Extract a pure helper `dispatchEnvelope(envelope, store)` that owns the per-command `safeParse` + dispatch loop; keep the React hook tiny — it only handles LiveKit subscription and byte decoding, then delegates. Schemas and the reducer migrate envelope fields to camelCase; payload fields stay snake_case until backend confirms.

**Tech Stack:** TypeScript, Zod, Zustand, Vitest, LiveKit client SDK, Next.js, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-27-transport-wire-up-design.md`

**Branch:** `feat/show-destination-detail-command` (continuation — already checked out)

---

## File Structure

No new source files. New test file. Conventions updated.

- **Modify** `lib/agent-ui/commands.ts` — `Base` envelope fields rename to `correlationId`, `sessionId`.
- **Modify** `lib/agent-ui/ui-view-store.ts` — every reducer reference `cmd.correlation_id` → `cmd.correlationId`.
- **Modify** `lib/agent-ui/transport.ts` — extract `dispatchEnvelope`, wire the hook to it; replace per-command logs with `applied` / `parse error` lines.
- **Modify** `lib/agent-ui/commands.test.ts` — substitute `correlation_id` → `correlationId` in fixtures.
- **Modify** `lib/agent-ui/ui-view-store.test.ts` — same substitution.
- **Create** `lib/agent-ui/transport.test.ts` — unit tests for `dispatchEnvelope` against a fresh store.
- **Modify** `conventions/agent-ui.md` — correct the snake_case-mirrors-wire paragraph.
- **Modify** `conventions/adding-a-command.md` — update the `Base` example and surrounding prose.

The mocks (`lib/dev/mocks.ts`) and the panel/views are untouched — they're driven by `UiView`, not `UiCommand`, so the envelope rename doesn't affect them.

The plan is a single rename + extraction; tasks 1–3 leave intermediate TypeScript errors on purpose (the exhaustive `never` check in the reducer plus strict type-checking enforce that the rename can't be half-done). Task 8 commits the whole change as one atomic unit.

---

### Task 1: Migrate `Base` schema to camelCase

**Files:**
- Modify: `lib/agent-ui/commands.ts`

- [ ] **Step 1: Update the `Base` object**

Replace the existing `Base` definition at the top of the file with:

```ts
const Base = z.object({
  correlationId: z.string(),
  sessionId: z.string().optional(),
});
```

Leave every command extension (`ShowDiscoveryCanvas`, `SoftRedirect`, `ShowItineraryOptions`, `ShowDestinationDetail`, `SetBookingSummary`, `SetCabinDetail`) and the `UiCommand` union exactly as they are.

- [ ] **Step 2: Confirm the build fails only downstream**

Run: `pnpm tsc --noEmit`

Expected: failures in `lib/agent-ui/ui-view-store.ts` (every `cmd.correlation_id` access), in `lib/agent-ui/commands.test.ts` (`correlation_id:` fixtures), and in `lib/agent-ui/ui-view-store.test.ts` (same). These are intentional — fixed in the next tasks. Do not commit yet.

---

### Task 2: Update the reducer to read `cmd.correlationId`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`

- [ ] **Step 1: Substitute the field reference**

In the `applyCommand` switch (`createUiViewStore` → `set(() => { switch (cmd.type) { ... } })`), every case currently writes `lastCorrelationId: cmd.correlation_id,`. Update all six cases to:

```ts
lastCorrelationId: cmd.correlationId,
```

(The cases are `show_discovery_canvas`, `show_itinerary_options`, `show_destination_detail`, `soft_redirect`, `set_booking_summary`, `set_cabin_detail`.)

No other line in this file changes. The state field `lastCorrelationId` was already camelCase, so this is the only edit needed.

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`

Expected: errors only in `commands.test.ts` and `ui-view-store.test.ts` now. `ui-view-store.ts` itself is clean.

---

### Task 3: Update test fixtures in `commands.test.ts`

**Files:**
- Modify: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Substitute the field name**

Every test in this file currently passes a literal `correlation_id: '...'` inside a `UiCommand.parse(...)` or `UiCommand.safeParse(...)` payload. Replace every occurrence of the literal field name `correlation_id` with `correlationId` throughout the file. No test names change. No assertions change. No new tests are added or removed.

The `recordParseError` shape is internal to the store and uses camelCase (`{ correlationId?, message }`); no test in this file touches that.

The test `rejects missing correlation_id` keeps its name (it's a description, not a literal field). Its body becomes:

```ts
it('rejects missing correlation_id', () => {
  const out = UiCommand.safeParse({ type: 'show_discovery_canvas' });
  expect(out.success).toBe(false);
});
```

(Body unchanged — the test asserts that omitting the envelope correlation field fails. The name describes the intent.)

- [ ] **Step 2: Run the file**

Run: `pnpm test lib/agent-ui/commands.test.ts`

Expected: all 21 tests pass.

---

### Task 4: Update test fixtures in `ui-view-store.test.ts`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Substitute the field name**

Same mechanical substitution: every literal `correlation_id: '...'` inside an `applyCommand({...})` call becomes `correlationId: '...'`. No test names change, no assertions change, no new tests. The test currently named `applyCommand(show_destination_detail) maps destination and images into view` (Task 7 of the previous plan) will need its `applyCommand` call updated likewise.

- [ ] **Step 2: Run the file**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`

Expected: all 24 tests pass.

---

### Task 5: Add `transport.test.ts`

**Files:**
- Create: `lib/agent-ui/transport.test.ts`

- [ ] **Step 1: Write the failing test file**

Create the file with this content (the helper `dispatchEnvelope` does not exist yet — the file will fail to compile, which is the intended TDD red):

```ts
import { describe, expect, it } from 'vitest';
import { dispatchEnvelope } from './transport';
import { createUiViewStore } from './ui-view-store';

const validDestinationDetail = {
  type: 'show_destination_detail',
  correlationId: 'cmd-1',
  payload: {
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: ['City of Music'],
    },
    images: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        caption: 'Vienna at dusk',
      },
    ],
  },
};

describe('dispatchEnvelope', () => {
  it('applies a valid command and updates the store view', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      { correlationId: 'env-1', commands: [validDestinationDetail] },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({
      type: 'dream_stage',
      destination: validDestinationDetail.payload.destination,
      images: validDestinationDetail.payload.images,
    });
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('cmd-1');
    expect(s.lastError).toBeNull();
  });

  it('records a parse error for an unknown command type without changing the view', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-2',
        commands: [{ type: 'show_welcome_canvas', correlationId: 'cmd-2', payload: {} }],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastCorrelationId).toBeNull();
    expect(s.lastError).not.toBeNull();
    expect(s.lastError?.correlationId).toBe('cmd-2');
  });

  it('records a parse error for a malformed payload', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-3',
        commands: [
          {
            type: 'show_destination_detail',
            correlationId: 'cmd-3',
            payload: {
              // destination missing
              images: [
                {
                  url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
                  caption: 'x',
                },
              ],
            },
          },
        ],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view).toEqual({ type: 'start' });
    expect(s.lastError).not.toBeNull();
    expect(s.lastError?.correlationId).toBe('cmd-3');
  });

  it('applies commands in order; last view-changing command wins', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      {
        correlationId: 'env-4',
        commands: [
          { type: 'show_discovery_canvas', correlationId: 'cmd-a' },
          validDestinationDetail,
        ],
      },
      store.getState()
    );
    const s = store.getState();
    expect(s.view.type).toBe('dream_stage');
    expect(s.lastCorrelationId).toBe('cmd-1');
  });

  it('does not throw when commands is missing or not an array', () => {
    const store = createUiViewStore();
    expect(() =>
      dispatchEnvelope({ correlationId: 'env-5' }, store.getState())
    ).not.toThrow();
    expect(() =>
      dispatchEnvelope(
        { correlationId: 'env-6', commands: 'not-an-array' },
        store.getState()
      )
    ).not.toThrow();
    expect(store.getState().view).toEqual({ type: 'start' });
  });
});
```

- [ ] **Step 2: Verify it fails to compile**

Run: `pnpm test lib/agent-ui/transport.test.ts`

Expected: compile/import error along the lines of `'dispatchEnvelope' is not exported from './transport'`. This is the TDD red. Do not commit yet.

---

### Task 6: Implement `dispatchEnvelope` and wire the hook

**Files:**
- Modify: `lib/agent-ui/transport.ts`

- [ ] **Step 1: Replace the file's contents**

Final state of the file:

```ts
'use client';

import { useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { UiCommand } from './commands';
import { uiViewStore } from './ui-view-store';

const TOPIC = 'ui-commands';

interface EnvelopeLike {
  correlationId?: unknown;
  sessionId?: unknown;
  timestamp?: unknown;
  commands?: unknown;
}

type Store = Pick<
  ReturnType<typeof uiViewStore.getState>,
  'applyCommand' | 'recordParseError'
>;

export function dispatchEnvelope(envelope: EnvelopeLike, store: Store): void {
  const commands = Array.isArray(envelope.commands) ? envelope.commands : [];
  for (const raw of commands) {
    const result = UiCommand.safeParse(raw);
    if (result.success) {
      store.applyCommand(result.data);
      console.log('[ui-commands] applied', {
        type: result.data.type,
        correlationId: result.data.correlationId,
      });
    } else {
      const r = raw as { correlationId?: unknown };
      const correlationId =
        typeof r.correlationId === 'string' ? r.correlationId : undefined;
      const message = result.error.issues.map((i) => i.message).join('; ');
      store.recordParseError({ correlationId, message });
      console.warn('[ui-commands] parse error', { correlationId, message, raw });
    }
  }
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

      console.log('[ui-commands] envelope', {
        correlationId: envelope.correlationId,
        sessionId: envelope.sessionId,
        timestamp: envelope.timestamp,
        count: Array.isArray(envelope.commands) ? envelope.commands.length : 0,
      });

      dispatchEnvelope(envelope, uiViewStore.getState());
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);
}
```

- [ ] **Step 2: Run the transport test**

Run: `pnpm test lib/agent-ui/transport.test.ts`

Expected: 5/5 tests pass.

- [ ] **Step 3: Type-check the whole project**

Run: `pnpm tsc --noEmit`

Expected: no errors.

---

### Task 7: Update conventions

**Files:**
- Modify: `conventions/agent-ui.md`
- Modify: `conventions/adding-a-command.md`

- [ ] **Step 1: Fix the snake_case claim in `agent-ui.md`**

Open `conventions/agent-ui.md` and find the bullet that says:

> `commands.ts` uses **snake_case** because it mirrors the wire protocol. `ui-view-types.ts` uses **camelCase** because it's internal.

Replace that single bullet with:

> `commands.ts` mirrors the wire protocol. Envelope-level fields (`correlationId`, `sessionId`) are **camelCase** because that's what the backend sends today. Payload fields stay **snake_case** until the backend confirms otherwise. `ui-view-types.ts` is **camelCase** because it's internal.

Leave the rest of the file alone.

- [ ] **Step 2: Fix the `Base` example in `adding-a-command.md`**

Open `conventions/adding-a-command.md` and find step 1 in the Checklist:

> Agree on the wire shape with the backend. Snake_case fields. Must include `correlation_id: string` (Base requires it) and optionally `session_id: string`.

Replace it with:

> Agree on the wire shape with the backend. Envelope-level fields (`correlationId`, `sessionId`) are camelCase to match the wire; payload fields are snake_case until the backend confirms otherwise. Must include `correlationId: string` (Base requires it) and optionally `sessionId: string`.

Also find the Zod example a few lines down. The example schema (`MyNewCommand = Base.extend(...)`) does not reference the envelope fields directly, so it does not need to change. Verify nothing else in the file references `correlation_id` literally; if you find such a reference, update it to `correlationId`.

- [ ] **Step 3: No commands run for this task**

Conventions are markdown; nothing to type-check or test. Move on to verification.

---

### Task 8: Full verification + atomic commit

**Files:** (no edits; this task verifies and commits Tasks 1–7 together)

- [ ] **Step 1: Type-check**

Run: `pnpm tsc --noEmit`

Expected: clean.

- [ ] **Step 2: Lint**

Run: `pnpm lint`

Expected: clean. If a rule fires, fix the root cause; do not disable rules or run `--fix` blindly across unrelated files.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`

Expected: all tests pass. The new `transport.test.ts` adds 5 tests; `commands.test.ts` and `ui-view-store.test.ts` keep their existing counts (no new or removed tests).

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`

Open the app, join a LiveKit room with an active agent session, trigger the agent flow that emits `show_destination_detail`. Verify in the browser:

- The UI lands on `dream_stage` rendering `PanelDream` with the agent-provided images.
- Console shows `[ui-commands] envelope { ... }` followed by `[ui-commands] applied { type: 'show_destination_detail', ... }` for the matched command.
- If the agent emits `show_welcome_canvas` (or any other unmodelled command), console shows `[ui-commands] parse error { correlationId, message, raw }` and the view does not change.
- No uncaught exceptions, no page reload.

Stop the dev server when done. (Per project memory: no Playwright / Chrome automation — manual eyeball pass only.)

- [ ] **Step 5: Stage and commit**

```bash
git add lib/agent-ui/commands.ts \
        lib/agent-ui/ui-view-store.ts \
        lib/agent-ui/transport.ts \
        lib/agent-ui/transport.test.ts \
        lib/agent-ui/commands.test.ts \
        lib/agent-ui/ui-view-store.test.ts \
        conventions/agent-ui.md \
        conventions/adding-a-command.md

git commit -m "$(cat <<'EOF'
feat(agent-ui): wire transport to store, migrate envelope to camelCase

Extract dispatchEnvelope as a pure helper so transport.ts can drive the
uiViewStore for every command in an envelope (apply on safeParse success,
recordParseError on failure, both logged). The hook itself stays tiny —
LiveKit subscription + byte decoding only.

Envelope-level fields (correlationId, sessionId) migrate from snake_case
to camelCase to match the real wire format observed in agent traffic.
Payload-internal fields stay snake_case until we have wire evidence to
the contrary.

Conventions updated to reflect the new naming reality.
EOF
)"
```

- [ ] **Step 6: Confirm clean tree**

Run: `git status`

Expected: `nothing to commit, working tree clean`. The branch is now ahead of its parent by the spec commit + this commit. Not pushed; no PR opened.
