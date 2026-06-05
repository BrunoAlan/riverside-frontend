# Transport codec + envelope validation (cleanup)

## Context

A `/simplify` review of `lib/agent-ui/transport.ts` surfaced a set of code-smell
and altitude findings. The console-logging findings (logging not env-gated,
duplicate envelope logs, `Array.isArray` computed twice, decode/json errors
invisible to the dev panel) were already resolved by the previous commit
(`9a21888`), which removed all `console.*` calls and started recording
`decode-error` / `json-error` events to the dev event log.

Three findings remain actionable and are the scope of this spec:

- **TextDecoder per message** (`transport.ts`): `new TextDecoder()` is allocated
  on every `DataReceived` message instead of being reused.
- **Encode/decode duplicated across files**: `transport.ts` hand-rolls
  `TextDecoder`, `frontend-intent.ts` hand-rolls `TextEncoder` +
  `JSON.stringify`. No shared helper.
- **Envelope duck-typed with `unknown`**: `EnvelopeLike` marks every field
  `unknown`, forcing downstream casts, and a malformed envelope (e.g. `commands`
  not an array) is silently dropped — inconsistent with the now-recorded
  decode/json failures.

## Goal

Reuse a single codec for wire encode/decode, and validate the inbound envelope
at the transport seam so envelope-level failures surface in the dev event panel
like every other transport failure. No change to command schemas, the view
store, or any view.

## Non-goals

- A `recordChannelEvent` wrapper around `recordDevEvent` (reviewed and skipped —
  `recordDevEvent` is already the helper; a wrapper adds indirection for little
  gain).
- An `envelope-received` success event (per-command events already cover the
  happy path).
- Any change to `UiCommand`, `ui-view-store.ts`, view types, or components.
- Re-introducing any `console.*` logging.

## Design

### 1. Shared codec — `lib/agent-ui/wire.ts` (new)

Module-level encoder/decoder instances (allocated once), with two thin helpers:

```ts
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeJson = (value: unknown): Uint8Array => encoder.encode(JSON.stringify(value));
export const decodeText = (bytes: Uint8Array): string => decoder.decode(bytes);
```

- `transport.ts` replaces `new TextDecoder().decode(payload)` with
  `decodeText(payload)`. `JSON.parse` stays inline in `transport.ts` (a separate
  `try/catch`) so the `decode-error` vs `json-error` labels remain distinct.
- `frontend-intent.ts` replaces
  `new TextEncoder().encode(JSON.stringify(envelope))` with
  `encodeJson(envelope)`.

This fixes the per-message allocation and removes the duplicated codec.

### 2. Envelope validation — `lib/agent-ui/commands.ts` + `transport.ts`

Add a permissive `Envelope` schema in `commands.ts`, next to `UiCommand`:

```ts
export const Envelope = z.object({
  correlationId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  commands: z.array(z.unknown()).default([]),
});
```

`dispatchEnvelope` changes signature from `(envelope: EnvelopeLike, store)` to
`(envelope: unknown, store)` and validates at the top:

```ts
export function dispatchEnvelope(envelope: unknown, store: Store): void {
  const parsed = Envelope.safeParse(envelope);
  if (!parsed.success) {
    recordDevEvent({ channel: 'ui-commands', label: 'envelope-error', ok: false, payload: envelope });
    return;
  }
  for (const raw of parsed.data.commands) {
    // …existing per-command parse / apply / record logic unchanged…
  }
}
```

- Iterate `parsed.data.commands` (typed `unknown[]`, default `[]`).
- The `envelope:` field passed to `recordDevEvent` on the happy/parse-error
  paths uses the **original** `envelope` reference, not `parsed.data` — Zod
  returns a new object, and the existing test asserts
  `expect(events[0].envelope).toBe(envelope)` (reference equality).
- The `EnvelopeLike` interface is deleted (no longer referenced).

### 3. Caller

`useUiCommandTransport` already passes the `JSON.parse` result to
`dispatchEnvelope`; with the signature now `unknown`, the cast at the parse site
(`as EnvelopeLike`) is removed. The handler keeps its own `decode-error` /
`json-error` recording for failures that happen before an envelope object even
exists.

### 4. Naming & documentation

Honoring `conventions/code-style.md` ("Default: no comments. Write one only when
the *why* is non-obvious. Don't restate what the code does."), documentation is
a **concise header comment per public function** — purpose/contract, not a
line-by-line restatement — matching the existing style in
`record-dev-event.ts` and `frontend-intent.ts`. No verbose `@param`/`@returns`
JSDoc. Functions to document: `encodeJson`, `decodeText` (`wire.ts`),
`dispatchEnvelope`, `useUiCommandTransport` (`transport.ts`). The
`frontend-intent.ts` functions already carry header comments.

Rename non-meaningful locals in `transport.ts` (no behavior change):

- `raw` → `rawCommand` (the unparsed command in the loop).
- `r` (the `raw as { correlationId?: unknown }` cast) → removed; read
  `correlationId` directly from the cast expression without the intermediate
  variable.
- `i` → `issue` in `result.error.issues.map((i) => i.message)`.
- `e` → `err` in the `decode` / `json` `catch` blocks.

### What stays untouched

- `lib/agent-ui/commands.ts` command schemas and the `UiCommand` union (only the
  new `Envelope` export is added).
- `lib/agent-ui/ui-view-store.ts`, view types, hooks, and all view components.
- `lib/dev/record-dev-event.ts`, `event-log-store.ts`, the dev panel UI.

## Data flow (after change)

```
LiveKit Room
   │  RoomEvent.DataReceived(payload, …, topic)
   ▼
useUiCommandTransport (transport.ts)
   │  filter topic === 'ui-commands'
   │  decodeText(payload)        — fail → record 'decode-error', return
   │  JSON.parse(text)           — fail → record 'json-error', return
   ▼
dispatchEnvelope(unknown, store)
   │  Envelope.safeParse(...)    — fail → record 'envelope-error', return
   │  for each raw command: UiCommand.safeParse → applyCommand / record
   ▼
uiViewStore + dev event log
```

## Tests

- **`lib/agent-ui/wire.test.ts` (new):** round-trip — `decodeText(encodeJson(x))`
  parses back to `x`; assert `encodeJson` returns a `Uint8Array`.
- **`lib/agent-ui/transport.test.ts`:** add a case asserting a malformed envelope
  (e.g. `commands: 'not-an-array'`) records one `envelope-error` event
  (`ok: false`) and leaves the view unchanged. The existing
  "does not throw when commands is missing or not an array" test still passes:
  missing `commands` validates (defaults to `[]`, no event); `commands:
  'not-an-array'` no longer throws and now also records the error event — that
  test asserts only no-throw + unchanged view, so it remains green.

## Behavior change (accepted)

Before: a malformed envelope was a silent no-op. After: it records one
`envelope-error` event in the dev panel (still no throw, view unchanged).
Intentional — it makes envelope-level failures observable, consistent with the
`decode-error` / `json-error` recording added in the previous commit.

## Risks / accepted tradeoffs

- **`decode-error` vs `json-error` split is academic.** `TextDecoder.decode`
  rarely throws (non-fatal by default). Kept as two labels to preserve the
  behavior just shipped; not worth collapsing.
- **`Envelope` is permissive by design.** It does not reject unknown extra
  fields or strictly type `timestamp`; it only guarantees `commands` is an
  array. This matches option A from brainstorming — observability without
  over-tightening optional fields.
