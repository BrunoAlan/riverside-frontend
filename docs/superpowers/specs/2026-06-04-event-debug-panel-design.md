# Event Debug Panel (dev) — Design

**Date:** 2026-06-04
**Status:** Approved, ready for implementation plan

## Goal

A development-only panel to debug the structured events flowing over LiveKit between
the agent and the frontend:

- **`ui-commands`** — structured UI commands the agent sends (and parse errors).
- **`frontend-intent`** — deterministic intents the frontend publishes.

This gives a live, in-app log of both event channels without relying on the browser
console, so we can see what the agent sent, what the frontend sent, and inspect the
full payloads (including the raw envelope for `ui-commands`).

## Scope

In scope — the two **structured** LiveKit channels only:

| Channel           | Direction        | Existing seam                              |
| ----------------- | ---------------- | ------------------------------------------ |
| `ui-commands`     | agent → frontend | `dispatchEnvelope` in `transport.ts`       |
| `frontend-intent` | frontend → agent | `publishFrontendIntent` in `frontend-intent.ts` |

Out of scope (explicitly decided against): chat / transcription text (`lk.chat`,
`lk.transcription`) and PostHog analytics events. Direction (`in`/`out`) is **not**
tracked as a field — the `channel` already identifies the source.

## Design

### Approach

Mirror the analytics wrapper pattern already in the repo: a single function that is
**always safe to call** and **no-ops in production**. Production code calls
`recordDevEvent(...)` at the two existing seams; everything else (the store, the UI)
lives under `lib/dev/` and is never reached in prod.

This keeps the "one seam" rule: production modules import only the lightweight
`recordDevEvent` function — never the dev store or the dev UI.

### Event shape

```ts
type DevEvent = {
  id: string;             // incremental counter — no Date.now()/Math.random() so it stays testable
  seq: number;            // monotonic sequence for stable ordering
  ts: number;             // epoch ms, captured at the seam
  channel: 'ui-commands' | 'frontend-intent';
  label: string;          // command.type | 'parse-error' | intent
  correlationId?: string;
  ok: boolean;            // false for parse errors
  payload: unknown;       // ui-commands: the parsed command (or raw on failure) · frontend-intent: the intent envelope
  envelope?: unknown;     // ui-commands: the full raw envelope it arrived in · undefined for frontend-intent
};
```

For `ui-commands`, `payload` holds the parsed command (or the raw command object when
parsing failed) and `envelope` holds the complete raw envelope (`correlationId`,
`sessionId`, `timestamp`, `commands[]`) — so we can inspect envelope-level metadata and
sibling commands. For `frontend-intent`, `payload` is the intent envelope and
`envelope` is undefined.

### Files

| File                              | Change | Role                                                                                              |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `lib/dev/event-log-store.ts`      | new    | Vanilla zustand singleton (`createStore` + `useStore` hook, like `voiceStore`). Ring buffer (cap 200), `record(e)`, `clear()`. Exposes `useDevEventLog`. |
| `lib/dev/record-dev-event.ts`     | new    | `recordDevEvent(...)` — always-safe wrapper; **no-ops when `NODE_ENV === 'production'`**. The only module production code imports. |
| `lib/agent-ui/transport.ts`       | edit   | In `dispatchEnvelope`: call `recordDevEvent` per applied command (`ok:true`) and per parse error (`ok:false`), passing the raw envelope. |
| `lib/agent-ui/frontend-intent.ts` | edit   | In `publishFrontendIntent`: call `recordDevEvent` for the outbound intent.                        |
| `lib/dev/dev-panel.tsx`           | edit   | Add **"Mocks" / "Events"** tabs; the Events tab renders the log.                                  |
| `lib/dev/event-log-list.tsx`      | new    | The log UI: one row per event (`ts · channel · label · corrId`), color-coded by channel; click a row to expand the JSON; Clear button; newest on top. |

### Data flow

```
ui-commands  → dispatchEnvelope ─┐
                                  ├─ recordDevEvent → eventLogStore.record   (no-op in prod)
frontend-intent → publish…       ─┘                          │
                                                    useDevEventLog → DevPanel "Events" tab
```

### Store API

- Vanilla zustand singleton so `recordDevEvent` can call it imperatively from
  non-React modules (`transport.ts`, `frontend-intent.ts`), plus a `useStore` hook for
  the panel — exactly the `voiceStore` / `uiViewStore` pattern.
- Ring buffer capped at 200 events; oldest dropped on overflow.
- `seq` is a monotonic counter held in the store; `id` derives from it (e.g. stringified
  `seq`) so no non-deterministic source is needed.

### UI

- The existing `DevPanel` gains a two-tab header: **Mocks** (the current content) and
  **Events** (the new log). Reuses the existing floating panel, toggle, and styling.
- Events tab: list of rows, newest first. Each row shows time, channel (color-coded),
  label, and short correlationId. Clicking a row expands it:
  - `ui-commands` → two `<pre>` blocks: **Command** (`payload`) and **Envelope** (`envelope`).
  - `frontend-intent` → one `<pre>` block: the intent.
- A **Clear** button empties the log.

### Isolation / guard

- `recordDevEvent` no-ops in production → zero cost and zero risk in prod; the code path
  never reaches the store.
- `DevPanel` is already mounted only under `IN_DEVELOPMENT` in `app.tsx`, so the UI does
  not exist in prod either.
- Production imports only `recordDevEvent`, never the store or UI — the "one seam" rule
  holds.

## Testing

Per `conventions/testing.md` we unit-test `lib/**` logic, not React components.

- `lib/dev/event-log-store.test.ts` — `record` appends; ring buffer respects the cap and
  drops the oldest; `clear` empties; `seq` increments monotonically.
- `lib/dev/record-dev-event.test.ts` — no-op under `NODE_ENV === 'production'`; in dev it
  calls `record` with the correct event shape; always safe to call.
- `lib/agent-ui/transport.test.ts` — existing tests stay green; add assertions that an
  applied command and a parse error each produce a recorded event (if it adds value).
- `dev-panel.tsx` / `event-log-list.tsx` — not unit-tested (repo rule: thin React glue is
  verified by running it).

## Out of scope / non-goals

- No chat/transcription logging.
- No PostHog event logging.
- No persistence across reloads (in-memory ring buffer only).
- No export/download of the log.
