# Chat Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render incoming agent text streams progressively (chunk-by-chunk) instead of waiting for `readAll()` to finish, with a pulsing `…` indicator while a message is still streaming.

**Architecture:** `useChatTranscription` switches from `await reader.readAll()` to iterating `for await (const partial of reader)`; each iteration writes the cumulative string to the messages list keyed by `reader.info.id`. `ChatMessage` gains an optional `streaming` flag that `ChatAgentMessage` renders as an animated trailing `…`. `appendMessage`'s identity short-circuit is widened to also compare the new flag so the final `streaming: false` flip is not dropped.

**Tech Stack:** React 19, `@livekit/components-react` (`useMaybeRoomContext`), `livekit-client` (`TextStreamReader` async iterator, `TextStreamHandler`), Tailwind (`animate-pulse`), vitest.

**Spec:** `docs/superpowers/specs/2026-05-27-chat-streaming-design.md`

---

## Task 1: Extend `ChatMessage` with `streaming` flag and refine equality

**Files:**
- Modify: `lib/chat/messages.ts`
- Modify: `lib/chat/messages.test.ts`

### Step 1: Write the failing test

Append this test to `lib/chat/messages.test.ts`, inside the existing `describe('appendMessage', () => { ... })` block (just before the closing `});`):

```ts
  it('returns a new array when only the streaming flag changes', () => {
    const list: ChatMessage[] = [{ id: 'a', role: 'agent', content: 'hi', streaming: true }];
    const next = appendMessage(list, { id: 'a', role: 'agent', content: 'hi', streaming: false });
    expect(next).not.toBe(list);
    expect(next[0]).toEqual({ id: 'a', role: 'agent', content: 'hi', streaming: false });
  });
```

### Step 2: Run the test to verify it fails

Run: `pnpm test lib/chat/messages.test.ts`

Expected: the new test fails. Either the type doesn't accept `streaming` (TypeScript error) or the assertion `not.toBe(list)` fails because the current equality check considers the two messages identical and short-circuits.

### Step 3: Update `lib/chat/messages.ts`

Replace the entire contents of `lib/chat/messages.ts` with:

```ts
export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
};

export function appendMessage(list: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1) return [...list, next];
  const existing = list[idx];
  if (
    existing.content === next.content &&
    existing.role === next.role &&
    (existing.streaming ?? false) === (next.streaming ?? false)
  ) {
    return list;
  }
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
```

### Step 4: Run the tests to verify they pass

Run: `pnpm test lib/chat/messages.test.ts`

Expected: all `appendMessage` tests pass, including the new one. The previously existing "returns the same array reference when content is identical" test continues to pass because both sides have `streaming` undefined, which the new check normalizes to `false`.

### Step 5: Typecheck and lint

Run: `pnpm tsc --noEmit`
Expected: no NEW errors. The pre-existing unrelated error in `components/chat/chat.tsx` may still appear; do not touch it.

Run: `pnpm lint`
Expected: clean.

### Step 6: Commit

```bash
git add lib/chat/messages.ts lib/chat/messages.test.ts
git commit -m "feat(chat): add streaming flag to ChatMessage"
```

---

## Task 2: Stream chunks in `useChatTranscription`

**Files:**
- Modify: `hooks/use-chat-transcription.ts`

The handler currently awaits `reader.readAll()` and pushes one message. After this task it iterates the reader as an async iterator. Each iteration emits the cumulative string so far; we write it under the same `id` and `appendMessage` reconciles it in place. After the loop ends we write one final entry with `streaming: false`.

### Step 1: Replace the file contents

Replace the entire contents of `hooks/use-chat-transcription.ts` with:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextStreamHandler } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { type ChatMessage, appendMessage } from '@/lib/chat/messages';

const CHAT_TOPIC = 'lk.chat';
const TRANSCRIPTION_TOPIC = 'lk.transcription';

export type UseChatTranscription = {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
};

export function useChatTranscription(): UseChatTranscription {
  const room = useMaybeRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (!room) return;

    const handler: TextStreamHandler = async (reader, participantInfo) => {
      const localIdentity = room.localParticipant?.identity;
      const role: ChatMessage['role'] =
        participantInfo.identity === localIdentity ? 'user' : 'agent';
      const id = reader.info.id;
      let content = '';
      for await (const partial of reader) {
        content = partial;
        setMessages((list) =>
          appendMessage(list, { id, role, content, streaming: true })
        );
      }
      setMessages((list) =>
        appendMessage(list, { id, role, content, streaming: false })
      );
    };

    room.registerTextStreamHandler(CHAT_TOPIC, handler);
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handler);

    return () => {
      room.unregisterTextStreamHandler(CHAT_TOPIC);
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
    };
  }, [room]);

  const sendMessage = useCallback(async (text: string) => {
    const current = roomRef.current;
    if (!current?.localParticipant) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const info = await current.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
    setMessages((list) => appendMessage(list, { id: info.id, role: 'user', content: trimmed }));
  }, []);

  return { messages, sendMessage };
}
```

Notes:

- `sendMessage` does **not** set `streaming`. User messages are written instantly with the full content and never need the indicator.
- The `for await` loop reads "cumulative" strings per `livekit-client` `TextStreamReader` docs, so writing the latest `partial` straight into `content` is correct (we don't concatenate).
- The handler does not check whether the role is `'user'` to skip the stream — even if a local participant somehow stream-publishes text, treating it uniformly is safe (the equality short-circuit will absorb identical updates).

### Step 2: Typecheck and lint

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

Run: `pnpm lint`
Expected: clean.

### Step 3: Run full test suite

Run: `pnpm test`
Expected: all tests pass. No tests target this hook directly (it requires a live LiveKit room), so the suite behavior is unchanged.

### Step 4: Commit

```bash
git add hooks/use-chat-transcription.ts
git commit -m "feat(chat): stream transcription chunks progressively"
```

---

## Task 3: Render streaming indicator in `ChatAgentMessage`

**Files:**
- Modify: `components/chat/chat-agent-message.tsx`

Adds the `streaming` prop and renders a pulsing `…` when truthy. The dots are decorative — the panel's `aria-live="polite"` already announces text updates.

### Step 1: Replace the file contents

Replace the entire contents of `components/chat/chat-agent-message.tsx` with:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatAgentMessageProps = {
  children: React.ReactNode;
  streaming?: boolean;
  className?: string;
};

function ChatAgentMessage({ children, streaming, className }: ChatAgentMessageProps) {
  return (
    <p
      data-slot="chat-agent-message"
      className={cn(
        'text-muted-foreground text-base leading-normal whitespace-pre-wrap',
        className
      )}
    >
      {children}
      {streaming ? (
        <span aria-hidden="true" className="ml-1 animate-pulse">
          …
        </span>
      ) : null}
    </p>
  );
}

export { ChatAgentMessage };
```

### Step 2: Typecheck and lint

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

Run: `pnpm lint`
Expected: clean.

### Step 3: Commit

```bash
git add components/chat/chat-agent-message.tsx
git commit -m "feat(chat): show streaming indicator on agent messages"
```

---

## Task 4: Wire `streaming` through `ChatOverlay`

**Files:**
- Modify: `components/chat/chat-overlay.tsx`

Only the `messages.map` block changes — pass `streaming` to `ChatAgentMessage`. User messages are unchanged.

### Step 1: Edit the messages map

In `components/chat/chat-overlay.tsx`, find this block:

```tsx
            {messages.map((m) =>
              m.role === 'user' ? (
                <ChatUserMessage key={m.id}>{m.content}</ChatUserMessage>
              ) : (
                <ChatAgentMessage key={m.id}>{m.content}</ChatAgentMessage>
              )
            )}
```

Replace the `ChatAgentMessage` line so the block becomes:

```tsx
            {messages.map((m) =>
              m.role === 'user' ? (
                <ChatUserMessage key={m.id}>{m.content}</ChatUserMessage>
              ) : (
                <ChatAgentMessage key={m.id} streaming={m.streaming}>
                  {m.content}
                </ChatAgentMessage>
              )
            )}
```

### Step 2: Typecheck, lint, and tests

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

Run: `pnpm lint`
Expected: clean.

Run: `pnpm test`
Expected: full suite passes (59/59 once Task 1's new test is counted).

### Step 3: Commit

```bash
git add components/chat/chat-overlay.tsx
git commit -m "feat(chat): pass streaming flag from overlay to agent message"
```

---

## Manual verification (after Task 4)

Per the user's standing preference (auto-memory), do **not** open Playwright/Chrome unless explicitly asked. Hand off with:

> "Done. Start `pnpm dev`, begin a call, and ask the agent something with a multi-sentence reply. The reply should appear word-by-word inside the chat panel with a pulsing `…` at the end; once the agent finishes, the dots vanish and the text remains. User messages still appear instantly with no indicator."
