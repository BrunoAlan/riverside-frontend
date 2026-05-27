# Chat Mocks — Design

Date: 2026-05-27
Branch: new branch off `main` (e.g. `feat/chat-mocks`)

## Problem

The chat dock is hard to style without running a real LiveKit session. To
iterate on the panel's visuals (empty state, long transcript scroll/fade,
streaming indicator), the developer has to start a call and prompt the agent.
There's no way to preview a pre-canned conversation.

The project already has a dev-only mocking pattern: `lib/dev/dev-panel.tsx`
ships `VIEW_MOCKS` and `BOOKING_SUMMARY_MOCKS` with apply/reset buttons gated
by `IN_DEVELOPMENT`. We extend the same pattern to chat.

## Goals

- Add a "chat" section to the existing DevPanel with a dropdown of canned
  conversations and an "Apply chat" button.
- `ChatDockContainer` renders the mocked messages when a mock is applied;
  otherwise behaves exactly as today.
- The dock becomes visible immediately after applying a mock (open the panel
  and, if `view.type === 'start'`, also apply the panel's currently selected
  view mock).
- The existing "Reset" button clears mocked messages alongside the view.
- In production, the mock store is never written, so the live flow is
  unaffected.

## Non-goals

- Mocking `sendMessage`. Input still calls the real LiveKit send; in mock
  mode it's effectively a no-op from the user's perspective and that's fine.
- Persisting mock selection across reloads.
- Per-message editing inside the DevPanel.
- Mocking streaming progression (chunk-by-chunk arrival). The streaming mock
  is a static snapshot with `streaming: true` on the last message.
- Tests for the mocks themselves (data is presentational, behind a dev gate).

## Design

### Data

`lib/dev/chat-mocks.ts`:

```ts
import type { ChatMessage } from '@/lib/chat/messages';

export type ChatMock = { id: string; label: string; messages: ChatMessage[] };

export const CHAT_MOCKS: ChatMock[] = [
  { id: 'empty', label: 'Empty', messages: [] },
  {
    id: 'short',
    label: 'Short (3 turns)',
    messages: [
      { id: 'm1', role: 'agent', content: 'Hola, ¿en qué te ayudo?' },
      { id: 'm2', role: 'user', content: 'Quiero reservar una sesión.' },
      { id: 'm3', role: 'agent', content: 'Perfecto, ¿para qué día?' },
    ],
  },
  {
    id: 'long-scroll',
    label: 'Long (scroll)',
    messages: [/* 12 alternating entries, mix of short and multi-line */],
  },
  {
    id: 'streaming',
    label: 'Streaming in progress',
    messages: [
      { id: 's1', role: 'user', content: '¿Cómo funciona el booking?' },
      { id: 's2', role: 'agent', content: 'Estoy procesando tu sol', streaming: true },
    ],
  },
];
```

`CHAT_MOCKS[0]` (empty) is the default selection.

### Store

`lib/dev/chat-mock-store.ts`:

```ts
'use client';
import { create } from 'zustand';
import type { ChatMessage } from '@/lib/chat/messages';

type State = {
  messages: ChatMessage[] | null;
  setMessages: (next: ChatMessage[] | null) => void;
};

export const useChatMockStore = create<State>((set) => ({
  messages: null,
  setMessages: (next) => set({ messages: next }),
}));

export const useDevChatMessages = () => useChatMockStore((s) => s.messages);
export const useSetDevChatMessages = () => useChatMockStore((s) => s.setMessages);
```

`null` means "no mock active" — container falls through to the live transcription.
Empty array `[]` is a valid mock (the empty conversation) and overrides live messages.

### DevPanel

`lib/dev/dev-panel.tsx`: append a new section below booking summary.

```tsx
<div className="mt-2 border-t border-white/20 pt-2">chat</div>
<label className="block">
  mock
  <select … value={chatMockId} onChange={…}>
    {CHAT_MOCKS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
  </select>
</label>
<button type="button" onClick={applyChat} className="w-full rounded bg-white text-black">
  Apply chat
</button>
```

`applyChat` behavior:

1. `setDevChatMessages(chosen.messages)`.
2. If `view.type === 'start'`, also call existing `applyView` so the dock
   mounts (`ChatDockContainer` returns null on `start`).
3. Write `'true'` to `sessionStorage['chat:dock:open']` so the panel opens
   when it mounts (avoids requiring a second click). Use the same key as
   `useSessionStorageState` in `chat-dock.tsx`.

`Reset` button: extend to also call `setDevChatMessages(null)`. Other resets
(view → start) stay as-is.

### Container

`components/layout/app.tsx` — `ChatDockContainer`:

```tsx
function ChatDockContainer() {
  const view = useUiView();
  const { messages: liveMessages, sendMessage } = useChatTranscription();
  const mockMessages = useDevChatMessages();
  if (view.type === 'start') return null;
  const messages = mockMessages ?? liveMessages;
  return <ChatDock messages={messages} onSubmit={sendMessage} />;
}
```

No other component touches the mock store.

### Production safety

- `useDevChatMessages()` lives in `lib/dev/`, but the override line runs in
  every environment. Safe because the store defaults to `null` and the only
  setter call site (`dev-panel.tsx`) is mounted under `IN_DEVELOPMENT`.
- Bundle size: the mocks file (~12 lines of text per mock) and a 10-line
  store. Negligible. Acceptable to ship in the prod bundle to keep the wiring
  symmetric, matching how `VIEW_MOCKS` is already imported by the panel only
  but exported as a regular module.

### Files touched

| File | Change |
| --- | --- |
| `lib/dev/chat-mocks.ts` | Create |
| `lib/dev/chat-mock-store.ts` | Create |
| `lib/dev/dev-panel.tsx` | Add chat section + apply button; extend Reset |
| `components/layout/app.tsx` | `ChatDockContainer` reads mock messages |

## Verification

Manual (no Playwright unless requested), with `pnpm dev`:

1. Open dev panel → new "chat" section visible with dropdown.
2. From the `start` view: select "Short", click Apply chat → dock appears with
   the 3 messages and the panel is open.
3. Select "Long (scroll)" + Apply → transcript shows scroll + top fade mask.
4. Select "Streaming in progress" + Apply → last agent bubble shows the
   pulsing `…` indicator.
5. Select "Empty" + Apply → panel open, transcript empty.
6. Click Reset → view returns to `start`, mock cleared. Re-entering a call
   shows live transcription as before.
7. In a real call (no mock applied), behavior matches main: messages stream
   from LiveKit.

No new automated tests — change is presentational and behind a dev-only gate.
The existing test suite (59/59) must still pass.
