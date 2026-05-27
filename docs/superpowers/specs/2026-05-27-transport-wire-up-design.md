# Wire `transport.ts` to the store — design

**Date:** 2026-05-27
**Branch:** `feat/show-destination-detail-command` (continuation of the destination-detail work)
**Status:** Approved (pending implementation plan)

## Context

After commit `ab86ad4` (`test(agent-ui): drop transport tests pending applyCommand rewire`)
the LiveKit transport hook only logs envelopes; it never dispatches into the
store. That was deliberate while we shipped the destination-detail rename.
Now we want to drive the UI from real agent traffic so we can smoke-test
`show_destination_detail` (and every other already-modelled command)
end-to-end with `pnpm dev`.

The live envelope shape, taken from console logs the user shared, is:

```jsonc
{
  "correlationId": "a2edf8d0-...",
  "sessionId": "voice_assistant_room_4686:voice_assistant_user_8447",
  "timestamp": "2026-05-27T17:33:54.752480+00:00",
  "commands": [
    {
      "type": "show_destination_detail",
      "correlationId": "9f74b89a-...",
      "payload": { /* ... */ }
    }
  ]
}
```

The envelope and per-command fields are **camelCase** on the wire
(`correlationId`, `sessionId`). The existing Zod schemas in `commands.ts`
use snake_case (`correlation_id`, `session_id`) because of an outdated
convention comment. The current `commands.ts` would reject every real
command for this reason.

## Goal

`pnpm dev` + a live agent session must move the UI in response to commands
the agent emits. Concretely:

- A `show_destination_detail` envelope updates `uiViewStore.view` to
  `dream_stage` with the destination + images from the payload.
- A malformed or unknown command (e.g. `show_welcome_canvas`, which the
  agent is currently sending but we deliberately don't model) is dropped
  without crashing, logs a parse-error line, and leaves the view as-is.
- Every other already-modelled command (`show_discovery_canvas`,
  `soft_redirect`, `show_itinerary_options`, `set_booking_summary`,
  `set_cabin_detail`) routes through the same path.

## Non-goals

- Migrating snake_case fields *inside* payloads
  (`reason_code`, `match_score`, `embarkation_port`,
  `disembarkation_port`, `cabin_id`). We have no wire evidence for those
  yet. The `destination_detail` payload uses single-word fields so it
  doesn't tell us. We migrate envelope-level fields only and wait for
  evidence before touching the rest.
- Adding `show_welcome_canvas` to the schema. The user confirmed that
  command "no se usa", so the correct behaviour is exactly what we get
  for free: schema rejects it → `recordParseError` → no UI change → log
  line in the console. That outcome is the spec, not a bug.
- Persisting envelope-level metadata (`sessionId`, `timestamp`) in the
  store. The store already tracks `lastCorrelationId` per command;
  that's enough for now.
- Reconnect / message replay, ordering across envelopes, batching.

## Architecture

The transport hook becomes the single LiveKit → store bridge. Today it is
a one-function hook with the parse logic inlined; we extract the
dispatch logic into a pure helper so the wiring can be unit-tested
without a `Room` mock.

```
LiveKit DataReceived('ui-commands')
  → decode bytes → JSON.parse → envelope-like object
  → dispatchEnvelope(envelope, store)
       for each cmd in envelope.commands:
         UiCommand.safeParse(cmd)
           success → store.applyCommand(parsed)
           failure → store.recordParseError({ correlationId, message })
```

The hook stays tiny: it owns the LiveKit event subscription and decodes
bytes; everything else lives in `dispatchEnvelope`.

## Changes

### 1. `lib/agent-ui/commands.ts` — envelope fields to camelCase

Update `Base` only:

```ts
const Base = z.object({
  correlationId: z.string(),
  sessionId: z.string().optional(),
});
```

Every command in the union (`show_discovery_canvas`, `soft_redirect`,
`show_itinerary_options`, `show_destination_detail`,
`set_booking_summary`, `set_cabin_detail`) inherits the change.

Payload fields (`reason_code`, `match_score`, `embarkation_port`,
`disembarkation_port`, `cabin_id`) stay snake_case.

### 2. `lib/agent-ui/ui-view-store.ts` — reducer reads camelCase

Every `cmd.correlation_id` becomes `cmd.correlationId`. The state field
`lastCorrelationId` already used camelCase, so the line becomes:

```ts
lastCorrelationId: cmd.correlationId,
```

No other reducer logic changes.

### 3. `lib/agent-ui/transport.ts` — extract `dispatchEnvelope`, wire it up

Final shape:

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

// Exported for unit tests; the hook is the only production caller.
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

Notes:
- The empty-envelope debug log (`'[ui-commands] empty envelope'`) goes
  away — `dispatchEnvelope` handles the empty case by iterating zero
  times. The envelope log still fires with `count: 0`.
- The per-command `'[ui-commands] command {...}'` log is replaced by
  `'[ui-commands] applied'` / `'[ui-commands] parse error'`. Both are
  more useful for the smoke-test.
- We pull `uiViewStore.getState()` inside the handler (not via
  `useUiViewStore`) so the hook doesn't re-subscribe on every state
  change.

### 4. Tests

- `lib/agent-ui/commands.test.ts`: replace every literal `correlation_id`
  field in test inputs with `correlationId`. No test deletions or
  additions — the schema's behaviour didn't change, only field naming.
- `lib/agent-ui/ui-view-store.test.ts`: same substitution. The reducer's
  behaviour didn't change either.
- Re-introduce `lib/agent-ui/transport.test.ts`. Tests target
  `dispatchEnvelope` against `createUiViewStore()`:
  - dispatches a valid `show_destination_detail` → store view becomes
    `dream_stage` with the payload.
  - dispatches an unknown command type → store unchanged, `lastError`
    populated, `lastCorrelationId` unchanged (no parse success).
  - dispatches a malformed payload (`show_destination_detail` missing
    `destination`) → `lastError` populated with a message.
  - dispatches an envelope with two commands in order → both applied,
    last one wins for `view` / `lastCorrelationId`.
  - dispatches an envelope where `commands` is missing or not an array
    → no throws, store untouched.

  No LiveKit `Room` is mocked; tests use the pure helper. The hook
  itself stays uncovered — that boundary is exercised manually via
  `pnpm dev`.

### 5. Conventions

- `conventions/agent-ui.md`: the paragraph that says "*commands.ts* uses
  snake_case because it mirrors the wire protocol" is now wrong. Update
  to: **envelope-level fields (`correlationId`, `sessionId`) are
  camelCase to match the wire; payload fields stay snake_case until the
  backend confirms otherwise.**
- `conventions/adding-a-command.md`: the Base example shows
  `correlation_id: string`. Update to `correlationId: string` (and the
  surrounding paragraph). The optional session field gets the same
  treatment.

### 6. Mocks

`lib/dev/mocks.ts` does not change. Mocks are `UiView` values driven via
`setViewFromDev`, not `UiCommand` values, so the rename of envelope
fields doesn't touch them.

## Verification

- `pnpm tsc --noEmit` clean (TypeScript will fail loudly if any
  reducer/test reference to `correlation_id` was missed).
- `pnpm lint` clean.
- `pnpm test` green, including the new `transport.test.ts`.
- Manual smoke test in `pnpm dev` with a live agent session:
  1. Open the app, join a room.
  2. Trigger the agent flow that emits `show_destination_detail`.
  3. Confirm the UI lands on the `dream_stage` view rendering
     `PanelDream` with the agent-provided Vienna images.
  4. Console shows the `'[ui-commands] applied'` line per command and a
     `'[ui-commands] parse error'` line for `show_welcome_canvas` (or
     whatever the agent emits that we don't model).
  5. No uncaught errors, no page reload required.

Per the user's auto-memory, no Playwright/Chrome verification — manual
eyeball pass only.

## Risks

- **Unknown payload field shapes for the other commands.** If the
  backend has migrated `reason_code` / `match_score` / etc. to camelCase
  too, those commands will fail at the payload level. We'll see them as
  `'[ui-commands] parse error'` lines and address them in a follow-up
  spec with concrete wire evidence.
- **Two commands per envelope** is supported (the schema parses each
  one independently), but if both target `view`, the last one wins.
  That matches the existing reducer behaviour.
