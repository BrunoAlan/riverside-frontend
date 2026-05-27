# Chat overlay implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the existing `ChatInput` overlaid on the bottom-left of every non-`start` view, connected to LiveKit so the user can send messages to the agent and see the latest user/agent turn above the input with a fade-out mask.

**Architecture:** Pure helpers for message handling live in `lib/chat/` (testable per `vitest.config.ts` — only `lib/**/*.test.ts` is collected). A React hook `useChatTranscription` wires LiveKit text streams to those helpers and exposes `{ messages, sendMessage }`. A presentational `ChatOverlay` component receives `{ messages, onSubmit }` and is mounted by a small container in `components/layout/app.tsx` that gates on `useUiView()`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind, `@livekit/components-react`, `livekit-client`, Vitest.

**Spec:** `docs/2026-05-27-chat-overlay-design.md`.

---

## File structure

- Create `lib/chat/messages.ts` — pure helpers: `parseStreamChunk`, `appendMessage` (dedupe by id).
- Create `lib/chat/messages.test.ts` — vitest tests for the helpers.
- Create `hooks/use-chat-transcription.ts` — React hook wrapping the room handlers + `useState<ChatMessage[]>`.
- Create `components/chat/chat-overlay.tsx` — presentation component.
- Modify `components/chat/chat.tsx` — export `ChatMessage` from a single place (already exported, just confirm it stays the canonical type).
- Modify `components/layout/app.tsx` — mount `<ChatOverlayContainer />` inside `AgentSessionProvider`, inside the `relative min-h-0 flex-1` wrapper that holds `ViewController`.

---

## Task 1: Message helpers (pure, testable)

**Files:**
- Create: `lib/chat/messages.ts`
- Test: `lib/chat/messages.test.ts`

These helpers own the "list of `ChatMessage` with dedupe by id" logic so the hook stays trivial.

- [ ] **Step 1: Write the failing test**

```ts
// lib/chat/messages.test.ts
import { describe, expect, it } from 'vitest';
import { appendMessage, type ChatMessage } from './messages';

const msg = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
});

describe('appendMessage', () => {
  it('appends a new message to the list', () => {
    const list: ChatMessage[] = [msg('a', 'user', 'hi')];
    const next = appendMessage(list, msg('b', 'agent', 'hello'));
    expect(next).toEqual([msg('a', 'user', 'hi'), msg('b', 'agent', 'hello')]);
  });

  it('replaces an existing message with the same id (later content wins)', () => {
    const list: ChatMessage[] = [msg('a', 'agent', 'hel')];
    const next = appendMessage(list, msg('a', 'agent', 'hello'));
    expect(next).toEqual([msg('a', 'agent', 'hello')]);
  });

  it('returns the same array reference when content is identical', () => {
    const list: ChatMessage[] = [msg('a', 'user', 'hi')];
    const next = appendMessage(list, msg('a', 'user', 'hi'));
    expect(next).toBe(list);
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `pnpm test messages`
Expected: FAIL — module `./messages` does not exist.

- [ ] **Step 3: Implement the helpers**

```ts
// lib/chat/messages.ts
export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

export function appendMessage(list: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1) return [...list, next];
  const existing = list[idx];
  if (existing.content === next.content && existing.role === next.role) return list;
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `pnpm test messages`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/chat/messages.ts lib/chat/messages.test.ts
git commit -m "feat(chat): add chat message append/dedupe helper"
```

---

## Task 2: Make `ChatMessage` in `chat.tsx` re-export the canonical type

**Files:**
- Modify: `components/chat/chat.tsx`

`components/chat/chat.tsx` currently defines `ChatMessage` inline. Switch it to re-export the type from `lib/chat/messages.ts` so the overlay, the hook, and the existing `Chat` component share one definition.

- [ ] **Step 1: Edit the file**

Replace lines 13–17 in `components/chat/chat.tsx`:

```ts
// before:
export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

// after:
export type { ChatMessage } from '@/lib/chat/messages';
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: no errors. The existing `app/(design-system)/design-system/page.tsx` import of `ChatMessage` from `@/components/chat/chat` keeps working because the re-export is transparent.

- [ ] **Step 3: Run the full test suite as a regression check**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat.tsx
git commit -m "refactor(chat): share ChatMessage type from lib/chat"
```

---

## Task 3: `useChatTranscription` hook

**Files:**
- Create: `hooks/use-chat-transcription.ts`

Subscribes to LiveKit text streams on the LiveKit Agents chat/transcription topics and exposes `{ messages, sendMessage }`. Note: per `conventions/testing.md` only `lib/**/*.test.ts` is collected by vitest — hooks are not unit-tested in this repo. The pure logic was extracted in Task 1 specifically so this hook can stay thin.

- [ ] **Step 1: Create the hook file**

```ts
// hooks/use-chat-transcription.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextStreamHandler } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { appendMessage, type ChatMessage } from '@/lib/chat/messages';

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

    const makeHandler =
      (role: ChatMessage['role']): TextStreamHandler =>
      async (reader, participantInfo) => {
        const localIdentity = room.localParticipant?.identity;
        const isLocal = participantInfo.identity === localIdentity;
        const resolvedRole: ChatMessage['role'] = isLocal ? 'user' : role;
        const content = await reader.readAll();
        const id = reader.info.id;
        setMessages((list) => appendMessage(list, { id, role: resolvedRole, content }));
      };

    const chatHandler = makeHandler('user');
    const transcriptionHandler = makeHandler('agent');

    room.registerTextStreamHandler(CHAT_TOPIC, chatHandler);
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, transcriptionHandler);

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
    setMessages((list) =>
      appendMessage(list, { id: info.id, role: 'user', content: trimmed })
    );
  }, []);

  return { messages, sendMessage };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: no errors. If `TextStreamHandler` import path or `sendText` signature does not match the installed version of `livekit-client` (`^2.17.2`), fix the import and the return type of `sendText` — the stream handler in `lib/agent-ui/transport.ts` is the reference for the signature already in use.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-chat-transcription.ts
git commit -m "feat(chat): add useChatTranscription hook"
```

---

## Task 4: `ChatOverlay` presentation component

**Files:**
- Create: `components/chat/chat-overlay.tsx`

Renders the bottom-left overlay: fade-masked transcript with only the last user + last agent message, a spacer for the future settings cog, and the existing `ChatInput`.

- [ ] **Step 1: Create the component**

```tsx
// components/chat/chat-overlay.tsx
'use client';

import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import type { ChatMessage } from '@/lib/chat/messages';
import { cn } from '@/lib/shadcn/utils';

export type ChatOverlayProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  className?: string;
};

function findLast<T>(list: T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = list.length - 1; i >= 0; i--) {
    if (predicate(list[i])) return list[i];
  }
  return undefined;
}

function ChatOverlay({ messages, onSubmit, className }: ChatOverlayProps) {
  const lastUser = findLast(messages, (m) => m.role === 'user');
  const lastAgent = findLast(messages, (m) => m.role === 'agent');

  const fadeMask = 'linear-gradient(to top, black 60%, transparent)';

  return (
    <div
      data-slot="chat-overlay"
      className={cn(
        'pointer-events-none absolute bottom-4 left-4 z-20 flex w-[360px] flex-col gap-2',
        className
      )}
    >
      <div
        className="flex max-h-[50vh] flex-col gap-3 overflow-hidden px-1"
        style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
      >
        {lastUser ? <ChatUserMessage>{lastUser.content}</ChatUserMessage> : null}
        {lastAgent ? <ChatAgentMessage>{lastAgent.content}</ChatAgentMessage> : null}
      </div>
      <div className="h-8" aria-hidden />
      <ChatInput
        className="pointer-events-auto"
        placeholder="Type here to exit voice mode..."
        onSubmit={onSubmit}
      />
    </div>
  );
}

export { ChatOverlay };
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/chat-overlay.tsx
git commit -m "feat(chat): add ChatOverlay presentation component"
```

---

## Task 5: Mount the overlay in the app shell

**Files:**
- Modify: `components/layout/app.tsx`

A small container component reads `useChatTranscription()` + `useUiView()` and renders nothing on the `start` view. Mount it inside the `relative min-h-0 flex-1` wrapper so the `absolute` positioning is relative to the view area (not the booking summary row).

- [ ] **Step 1: Edit `app.tsx`**

Add imports near the existing imports:

```ts
import { ChatOverlay } from '@/components/chat/chat-overlay';
import { useChatTranscription } from '@/hooks/use-chat-transcription';
import { useUiView } from '@/lib/agent-ui/hooks';
```

Add the container component above the `App` component (after `AppSetup`):

```tsx
function ChatOverlayContainer() {
  const view = useUiView();
  const { messages, sendMessage } = useChatTranscription();
  if (view.type === 'start') return null;
  return <ChatOverlay messages={messages} onSubmit={sendMessage} />;
}
```

Update the JSX inside `App` to mount it inside the view wrapper:

```tsx
<div className="relative min-h-0 flex-1">
  <ViewController />
  <ChatOverlayContainer />
</div>
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all green (no new tests, but verify nothing regressed).

- [ ] **Step 4: Manual smoke check (dev panel)**

Per `conventions/testing.md`, UI is verified visually. Start the dev server:

```bash
pnpm dev
```

Open `/agent`. Verify:
- On the welcome/start view: no chat overlay is visible.
- After the agent transitions to any other view (use the dev panel to force `dream_stage`, `itinerary`, etc.): a `360px` input is anchored bottom-left, with the placeholder "Type here to exit voice mode...".
- Typing and pressing Enter clears the input and shows the user message above with the fade mask.

If the LiveKit session is not running, the input still renders but `sendMessage` is a no-op (room ref is null) — that is the desired behavior.

- [ ] **Step 5: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(chat): mount chat overlay on non-start views"
```

---

## Task 6: Pre-PR checks

**Files:** none.

- [ ] **Step 1: Run the pre-PR checklist from `conventions/git-workflow.md`**

```bash
pnpm lint
pnpm test
pnpm format:check
```

Expected: all pass. If `format:check` fails, run `pnpm format` and amend the last commit or add a `chore: format` commit.

- [ ] **Step 2: Confirm branch state**

```bash
git log --oneline main..HEAD
```

Expected: 5 commits on `feat/chat-overlay` (the docs commit from brainstorming, plus tasks 1–5).
