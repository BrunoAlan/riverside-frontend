# UI command envelope — receive & log (v1)

## Context

The backend started publishing UI commands over the LiveKit **data channel** (`participant.publish_data`) on topic `ui-commands`, using an envelope shape:

```json
{
  "version": "v1",
  "topic": "ui-commands",
  "correlationId": "…",
  "sessionId": "room:user",
  "timestamp": "ISO-8601",
  "commands": [
    { "type": "...", "correlationId": "...", "timestamp": "...", "payload": { … } }
  ]
}
```

The current frontend (`lib/agent-ui/transport.ts`) subscribes via `room.registerTextStreamHandler('ui-commands', …)` and expects a single, flat `UiCommand` with snake_case keys (`correlation_id`, `session_id`). Two consequences:

- The text-stream handler **never fires** for the new transport, so nothing reaches the store.
- Even if it did, the camelCase envelope + nested `commands[]` would fail `safeParse`.

A throwaway `debug-transport.ts` was added during exploration to confirm the transport and shape. With that confirmed, we can fold the logging into the real transport file and drop the throwaway.

## Goal

Move logging of UI command envelopes into `lib/agent-ui/transport.ts` (the canonical place) so we can observe what the backend emits **without** changing schemas, store, or views yet. This is intentionally a no-op for the UI — a stepping stone before we wire `applyCommand` in a follow-up.

## Non-goals

- Updating `UiCommand` (no rename, no new types, no camelCase migration).
- Updating `ui-view-store.ts`, view types, or any view component.
- Rendering anything from the new payloads.
- Handling backwards compatibility with the old text-stream transport (the backend no longer uses it).

## Design

### Transport

Rewrite `useUiCommandTransport` in `lib/agent-ui/transport.ts`:

- Subscribe to `RoomEvent.DataReceived` on the current `Room`.
- Filter to `topic === 'ui-commands'`. Ignore everything else.
- Decode `Uint8Array` → string via `TextDecoder`. If decoding fails, `console.warn` and return.
- `JSON.parse` the string. On error, `console.warn('[ui-commands] JSON parse error', { error, text })` and return.
- If the parsed value has `commands: []` (empty array), `console.debug('[ui-commands] empty envelope', { correlationId })` and return.
- Otherwise, `console.log('[ui-commands] envelope', { correlationId, sessionId, timestamp, count: commands.length })` and then for each entry `console.log('[ui-commands] command', { type, correlationId, payload })`.
- Do **not** call `applyCommand` or `recordParseError`. Do **not** validate against the existing Zod schema.
- Cleanup: `room.off(RoomEvent.DataReceived, handler)` in the effect cleanup.

The exported surface shrinks to just `useUiCommandTransport`. `handleUiCommandStream` is removed.

### Cleanup

- Delete `lib/agent-ui/debug-transport.ts`.
- Remove the `useDebugUiTransport()` call and its import from `components/layout/app.tsx`.
- Delete `lib/agent-ui/transport.test.ts` (tested the removed text-stream handler and snake_case schema; not worth porting until we wire `applyCommand` again).

### What stays untouched

- `lib/agent-ui/commands.ts` (Zod schema and `UiCommand` discriminated union).
- `lib/agent-ui/ui-view-store.ts`, `ui-view-types.ts`, `hooks.ts`.
- All views under `components/agent-ui/` and `view-registry.ts`.
- `useAgentErrors` and the parse-error reporting pipeline (no parse errors are recorded in this state).

## Data flow (after change)

```
LiveKit Room
   │  RoomEvent.DataReceived(payload, participant, kind, topic)
   ▼
useUiCommandTransport (lib/agent-ui/transport.ts)
   │  filter topic === 'ui-commands'
   │  decode → JSON.parse
   │  console.log envelope + each command
   ▼
(stops here — store/views not touched)
```

## Tests

None for this change. The transport is a thin logging adapter; once we re-wire `applyCommand`, we'll add tests for the dispatch logic.

## Risks / accepted tradeoffs

- **UI is dark.** While this state ships, the agent's UI commands are visible only in the browser console. This is intentional; the next iteration restores dispatch.
- **No type safety on the envelope.** We're logging `unknown`. Acceptable because nothing downstream consumes it.
- **Log noise.** Every envelope (including empty heartbeats at `debug` level) prints to the console. Acceptable while validating the format; we can downgrade later.

## Follow-up (out of scope here)

- Define a Zod schema for the envelope and the camelCase `UiCommand` variants observed (`show_welcome_canvas`, updated `show_itinerary_options`, etc.).
- Rewire `applyCommand` to consume the envelope batch.
- Decide overlay rendering for `show_welcome_canvas` `{ message, sub_message }` on the presentation view.
- Restore transport tests against the new dispatch logic.
