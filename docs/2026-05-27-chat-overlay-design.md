# Chat overlay — design

Integrates the existing `ChatInput` component into the app, connected to LiveKit, with a fade-in/out transcript above it. Shown overlaid on the bottom-left of every view except `start`.

## Goals

- User can type a message to the agent from any non-start view.
- Last user prompt and last agent response are visible above the input, fading toward the top.
- All LiveKit transport details stay isolated in one hook.

## Non-goals

- Settings cog (placeholder space only — separate PR).
- Muting the mic / exiting voice mode on send. Placeholder copy only; behavior is just "send text".
- Mobile layout polish (desktop-first; revisit if it conflicts with `BookingSummaryContainer`).
- Real summarization. We render raw transcription text; the fade mask provides the "only the latest" feel.

## Pieces

### `hooks/use-chat-transcription.ts`

Subscribes to LiveKit text streams and exposes `{ messages, sendMessage }`.

- Uses `useMaybeRoomContext()` from `@livekit/components-react` (matches `lib/agent-ui/transport.ts`).
- On mount, registers text stream handlers for the LiveKit Agents chat/transcription topics (`lk.chat`, `lk.transcription`). Unregisters on unmount.
- Each incoming stream produces a `ChatMessage` (`{ id, role: 'user' | 'agent', content }`) — the type already exists in `components/chat/chat.tsx` and will be re-exported from a shared location to avoid a cross-component import.
- `sendMessage(text)` calls `room.localParticipant.sendText(text, { topic: 'lk.chat' })` and optimistically appends a user `ChatMessage` to local state. The eventual echo from the transcription topic is deduped by stream/message id.
- State is `useState<ChatMessage[]>([])`. Bounded growth is fine for a single session; no trimming logic in v1.
- Has its own `*.test.ts` exercising: register/unregister on room change, optimistic append on send, dedupe of echoed user messages, append of agent messages from the stream.

### `components/chat/chat-overlay.tsx`

Pure presentation. Receives `{ messages, onSubmit }`.

- Wrapper: `absolute bottom-4 left-4 z-20 w-[360px] flex flex-col gap-2 pointer-events-none`.
  - `pointer-events-none` on the wrapper so the transcript fade area doesn't block map interactions; `pointer-events-auto` on the input itself.
- Transcript area:
  - Renders only the last user message and last agent message (filter by `role` from the tail of `messages`).
  - `max-h-[50vh] overflow-hidden`.
  - Fade mask: `style={{ maskImage: 'linear-gradient(to top, black 60%, transparent)', WebkitMaskImage: ... }}`.
  - Reuses `ChatUserMessage` and `ChatAgentMessage` for styling consistency with the existing `Chat` component.
- Settings cog: leave a small empty slot above the input (`h-8`) so the layout is stable when the cog is added later. No icon rendered.
- Input: `<ChatInput placeholder="Type here to exit voice mode..." onSubmit={onSubmit} />`.

### Wiring in `components/layout/app.tsx`

- New small client component `ChatOverlayContainer` (collocated with the overlay or inside `app.tsx`) that:
  - Calls `useChatTranscription()` and `useUiView()`.
  - Returns `null` when `view.type === 'start'`.
  - Otherwise renders `<ChatOverlay messages={messages} onSubmit={sendMessage} />`.
- Mounted inside `AgentSessionProvider`, alongside `BookingSummaryContainer`, inside the same `relative min-h-0 flex-1` wrapper that holds `ViewController` (so it positions against the view, not the booking summary row).

## Data flow

```
user types → ChatInput.onSubmit
           → ChatOverlayContainer.sendMessage
           → useChatTranscription.sendMessage
           → room.localParticipant.sendText(text, { topic: 'lk.chat' })
           + optimistic append to messages[]

agent text stream on lk.chat / lk.transcription
           → useChatTranscription handler
           → append ChatMessage to messages[] (dedupe by id)
           → ChatOverlay re-renders with new tail
```

## Visibility rules

| `view.type`         | Overlay shown |
| ------------------- | ------------- |
| `start`             | no            |
| `presentation`      | yes           |
| `dream_stage`       | yes           |
| `itinerary`         | yes           |
| `compare_itinerary` | yes           |
| `cabin_selection`   | yes           |

## Testing

- `use-chat-transcription.test.ts` — covers handler register/unregister, send + optimistic append, incoming agent message append, dedupe.
- `chat-overlay.test.tsx` — covers: renders only last user + last agent message; submitting input calls `onSubmit`; renders nothing useful when `messages` is empty (just the input).
- No new tests for `app.tsx` (composition only).

## Open items deferred to follow-up

- Settings cog and its panel.
- "Exit voice mode" behavior on submit (mic mute, mode switch).
- Mobile layout / collision with `BookingSummaryContainer` on narrow viewports.
- Trimming `messages[]` if a session accumulates very long history.
