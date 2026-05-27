# Agent-driven UI

The backend agent doesn't render anything — it sends **UI commands** over LiveKit, and the frontend translates them into **views**. This file explains the flow end-to-end.

## Concepts

- **`UiCommand`** — a message from the agent. Shape: discriminated union by `type`, validated with Zod.
  Source: [`lib/agent-ui/commands.ts`](../lib/agent-ui/commands.ts).
- **`UiView`** — the visual state the user sees. Discriminated union by `type`.
  Source: [`lib/agent-ui/ui-view-types.ts`](../lib/agent-ui/ui-view-types.ts).
- **`uiViewStore`** — zustand store holding the current view, source (`agent`/`dev`/`user`/`initial`), hints, and parse errors.
  Source: [`lib/agent-ui/ui-view-store.ts`](../lib/agent-ui/ui-view-store.ts).
- **`VIEW_REGISTRY`** — maps a `UiView['type']` to a React component.
  Source: [`components/agent-ui/view-registry.ts`](../components/agent-ui/view-registry.ts).
- **`VIEW_MOCKS`** — sample `UiView` payloads exposed in the dev panel for designing/testing without the backend.
  Source: [`lib/dev/mocks.ts`](../lib/dev/mocks.ts).

## Flow

```
LiveKit text stream  ──▶  transport.ts  ──▶  Zod parse  ──▶  uiViewStore.applyCommand
                                                                       │
                                                                       ▼
                                                  uiViewStore.view (UiView)
                                                                       │
                                                                       ▼
                                                  ContentView reads view
                                                                       │
                                                                       ▼
                                                  VIEW_REGISTRY[view.type] renders
```

1. The agent publishes a JSON message on the LiveKit text-stream topic `ui-commands`.
2. [`transport.ts`](../lib/agent-ui/transport.ts) reads the stream, `JSON.parse`s, validates with the `UiCommand` Zod union, and either:
   - calls `applyCommand(cmd)` on the store, or
   - calls `recordParseError(...)` if the payload is invalid.
3. `applyCommand` is a pure reducer (`switch` on `cmd.type`) that produces the next `UiView` and stores the `correlationId`.
4. [`ContentView`](../components/agent-ui/content-view.tsx) reads the current view and renders `VIEW_REGISTRY[view.type]`.

## Sources of truth

The same store can be updated from four sources, tracked in `source`:

| Source    | Setter            | Used by                               |
| --------- | ----------------- | ------------------------------------- |
| `initial` | initial state     | First load                            |
| `agent`   | `applyCommand`    | Real `UiCommand` over LiveKit         |
| `dev`     | `setViewFromDev`  | The dev panel                         |
| `user`    | `setViewFromUser` | User-initiated transitions in the app |

The reducer is exhaustively type-checked — adding a new `UiCommand` variant without handling it is a compile error.

## Things to keep in mind

- The store is a **singleton** (`uiViewStore`). For tests, use `createUiViewStore()` to get a fresh instance.
- `commands.ts` mirrors the wire protocol. Envelope-level fields (`correlationId`, `sessionId`) are **camelCase** because that's what the backend sends today. Payload fields stay **snake_case** until the backend confirms otherwise. `ui-view-types.ts` is **camelCase** because it's internal.
- A command may update only the `hint` (e.g. `soft_redirect`) and leave `view` untouched.
- Never read from LiveKit directly outside `transport.ts`. Always go through the store.

## Related how-tos

- [Adding a new UI command](./adding-a-command.md)
- [Adding a new view + mock](./adding-a-view.md)
