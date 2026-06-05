# Message flow (LiveKit ↔ app)

How a message travels through the agent-UI layer in **both** directions: inbound
(the agent sends a `UiCommand` that becomes a view) and outbound (the user does
something and the app emits a `FrontendIntent`). Every box below is a real module
under `lib/agent-ui/`.

For the _meaning_ of each message see the reference lists — [`ui-commands.md`](./ui-commands.md)
(BE → FE) and [`frontend-intents.md`](./frontend-intents.md) (FE → BE). This file is
about the **plumbing**: who decodes, who validates, who records, who applies.

## The shared pieces

- **`wire.ts`** — the JSON codec. One module-level `TextEncoder`/`TextDecoder`,
  reused for every message. `encodeJson(value)` for outbound, `decodeText(bytes)`
  for inbound. Nothing else allocates a codec.
- **LiveKit data channel** — two topics: `ui-commands` (inbound) and
  `frontend-intent` (outbound). The app only touches LiveKit inside `transport.ts`
  (receive) and `frontend-intent.ts` (send).
- **dev event log** — `recordDevEvent(...)` writes to the `eventLogStore` ring
  buffer (200 events, dev-only no-op in prod). Every seam in both flows records
  here, so the DevPanel **Events** tab is a single timeline of everything that
  crossed the wire. See [`agent-ui.md`](./agent-ui.md) for the view side.

---

## Inbound — a message arrives (`ui-commands`)

The agent publishes a JSON **envelope** wrapping a batch of commands. We decode,
validate the envelope, then validate each command, applying the valid ones to the
store. Failures never throw — each one records a distinct event and the flow
continues.

```
LiveKit room
  │  RoomEvent.DataReceived (topic = "ui-commands")
  ▼
useUiCommandTransport (transport.ts)          ── React hook, mounted in app.tsx
  │
  ├─ topic !== "ui-commands" ──────────────▶ ignore
  │
  ▼
decodeText(payload)            (wire.ts)
  │   └─ throws ─────────────────────────────▶ recordDevEvent "decode-error" (ok:false) ─▶ stop
  ▼
JSON.parse(text)
  │   └─ throws ─────────────────────────────▶ recordDevEvent "json-error"   (ok:false) ─▶ stop
  ▼
dispatchEnvelope(envelope, uiViewStore)
  │
  ▼
UiCommandEnvelope.safeParse    (commands.ts)  ── permissive: commands must be an array
  │   └─ !success ──────────────────────────▶ recordDevEvent "envelope-error" (ok:false) ─▶ stop
  ▼
for each rawCommand in envelope.commands:
  │
  ▼
UiCommand.safeParse            (commands.ts)  ── discriminated union by `type`
  ├─ success ─▶ uiViewStore.applyCommand(cmd) ─▶ recordDevEvent <cmd.type>   (ok:true)
  │                    │
  │                    ▼
  │             uiViewStore.view = next UiView (source: "agent")
  │                    │
  │                    ▼
  │             ContentView renders VIEW_REGISTRY[view.type]
  │
  └─ !success ─▶ uiViewStore.recordParseError ─▶ recordDevEvent "parse-error" (ok:false)
                 (command skipped, loop continues with the next one)
```

**Failure labels, narrowest scope first** — each marks how far the message got:

| Label            | Means                                                       | Recorded in    |
| ---------------- | ----------------------------------------------------------- | -------------- |
| `decode-error`   | bytes weren't valid UTF-8                                   | `transport.ts` |
| `json-error`     | decoded text wasn't valid JSON                              | `transport.ts` |
| `envelope-error` | JSON wasn't a valid envelope (e.g. `commands` not an array) | `transport.ts` |
| `parse-error`    | one command failed the `UiCommand` union                    | `transport.ts` |
| `<cmd.type>`     | command applied successfully                                | `transport.ts` |

A bad envelope drops the **whole batch**; a bad command drops only **that command**.

Source: [`transport.ts`](../lib/agent-ui/transport.ts), [`wire.ts`](../lib/agent-ui/wire.ts),
[`commands.ts`](../lib/agent-ui/commands.ts), [`ui-view-store.ts`](../lib/agent-ui/ui-view-store.ts).

---

## Outbound — a message is sent (`frontend-intent`)

The user does something in the UI. The app emits a `FrontendIntent` so the
deterministic backend can skip the LLM classifier and run the intent directly.
The app does **not** move the UI itself — it waits for the backend to answer with a
`UiCommand` (which re-enters via the inbound flow above). The only exception is a
purely local view transition (`setViewFromUser`).

```
UI component (e.g. panel-map.tsx)
  │  sendIntent("explore_destination", { entities, userMessage })
  ▼
useFrontendIntent (hooks/use-frontend-intent.ts)
  │   └─ no localParticipant ─────────────────▶ console.warn, drop (nothing sent)
  ▼
buildFrontendIntent(intent, opts)   (frontend-intent.ts)  ── stamps version:"v1", topic
  ▼
publishFrontendIntent(participant, envelope)
  │
  ▼
encodeJson(envelope)                (wire.ts)
  ▼
participant.publishData(bytes, { topic: "frontend-intent", reliable: true })
  │
  ├──────────────────────────────────────────▶ LiveKit room ─▶ backend
  ▼
recordDevEvent { channel:"frontend-intent", label: intent, ok:true }
```

The envelope shape and the full intent list live in [`frontend-intents.md`](./frontend-intents.md).

Source: [`use-frontend-intent.ts`](../hooks/use-frontend-intent.ts),
[`frontend-intent.ts`](../lib/agent-ui/frontend-intent.ts), [`wire.ts`](../lib/agent-ui/wire.ts).

---

## The round trip

The two flows form a loop: a user action emits an intent, the backend answers with
commands, and those commands drive the view. The dev event log captures both legs,
so a single `correlationId` lets you trace an interaction end-to-end in the
DevPanel **Events** tab.

```
 user action ─▶ frontend-intent (outbound) ─▶ backend
                                                 │
 view update ◀─ ui-commands (inbound) ◀──────────┘
```

## Things to keep in mind

- **Codec only in `wire.ts`.** Don't `new TextEncoder()/TextDecoder()` anywhere
  else — both flows go through `encodeJson`/`decodeText`.
- **LiveKit only in `transport.ts` and `frontend-intent.ts`.** Everything else
  talks to `uiViewStore` or `useFrontendIntent`.
- **Failures record, never throw.** Inbound errors surface as events, not crashes.
  If something "didn't happen", check the Events tab for an `ok:false` row.
- **`UiCommandEnvelope` (inbound) ≠ `FrontendIntent` (outbound).** Two different
  envelopes on two different topics — the names are deliberately distinct.
- **`recordDevEvent` is a prod no-op**, so these seams are free to leave in place.
