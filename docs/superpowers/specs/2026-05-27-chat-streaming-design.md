# Chat Streaming — Design

Date: 2026-05-27
Branch: `feat/chat-overlay`

## Problem

`useChatTranscription` calls `await reader.readAll()` on each incoming text
stream. That blocks until the stream finishes and only then appends the
message. The user sees agent replies appear as a single complete block instead
of growing while the agent speaks.

## Goals

- Agent (and any other remote) messages render progressively as their text
  stream chunks in.
- While a message is still streaming, show a `…` animated indicator at the end
  of its bubble.
- Once a stream finishes, the indicator disappears and the text remains.

## Non-goals

- No cancel-on-unmount of in-flight streams.
- No throttling / batching beyond what React 19 already does.
- No new error handling (matches existing hook's style — it has none).
- No streaming indicator on user messages (`sendMessage` posts the full text
  immediately; user bubbles never have a partial state).
- No retroactive markdown / rich formatting.

## Design

### Data layer

`lib/chat/messages.ts`:

- Extend `ChatMessage` with `streaming?: boolean` (optional). Undefined is
  treated as not-streaming.
- `appendMessage` already deduplicates by `id`. Today it short-circuits when
  the existing entry has the same `content` and `role`. That check must also
  consider `streaming`, otherwise the final flip (`streaming: true → false`
  with the same final content) is silently dropped.

```ts
export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
};
```

Equality rule inside `appendMessage`:

```ts
if (
  existing.content === next.content &&
  existing.role === next.role &&
  (existing.streaming ?? false) === (next.streaming ?? false)
) return list;
```

### Hook

`hooks/use-chat-transcription.ts` replaces the `readAll()` call with a chunk
iterator. The `TextStreamReader`'s async iterator yields the **cumulative**
string up to that point, so each chunk can be written straight into the
message:

```ts
const handler: TextStreamHandler = async (reader, participantInfo) => {
  const localIdentity = room.localParticipant?.identity;
  const role: ChatMessage['role'] =
    participantInfo.identity === localIdentity ? 'user' : 'agent';
  const id = reader.info.id;
  let content = '';
  for await (const partial of reader) {
    content = partial;
    setMessages((list) => appendMessage(list, { id, role, content, streaming: true }));
  }
  setMessages((list) => appendMessage(list, { id, role, content, streaming: false }));
};
```

If the iterator yields nothing (empty stream), the closing `setMessages` still
runs and writes an empty-content, not-streaming entry. That's an edge case the
existing code already had (it would have written an empty string too); no new
behavior to handle.

### UI

`components/chat/chat-agent-message.tsx`:

- Accept `streaming?: boolean` alongside its existing `children`.
- When `streaming === true`, render a trailing `<span aria-hidden="true" className="ml-1 animate-pulse">…</span>` after the text.
- `aria-hidden` because the indicator is decorative; the `aria-live` region on the panel will already announce content updates.

`components/chat/chat-overlay.tsx`:

- Pass `streaming={m.streaming}` to the `<ChatAgentMessage>`.
- User messages: no change.

### Files touched

| File                                       | Change |
| ------------------------------------------ | ------ |
| `lib/chat/messages.ts`                     | Add `streaming?` field, refine equality |
| `lib/chat/messages.test.ts`                | Add test for streaming-flip equality |
| `hooks/use-chat-transcription.ts`          | Stream chunks instead of `readAll()` |
| `components/chat/chat-agent-message.tsx`   | Render trailing dots while streaming |
| `components/chat/chat-overlay.tsx`         | Pass `streaming` prop down |

## Verification

Manual on running dev server: have the agent reply to a prompt. The text
should grow inside the bubble while the agent speaks, with a `…` pulsing at
the end; the dots disappear once the stream closes.

Unit: `appendMessage` test asserting that flipping `streaming` from `true` to
`false` with the same content returns a new array reference (so React rerenders
and the indicator clears).
