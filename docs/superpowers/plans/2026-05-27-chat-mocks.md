# Chat Mocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the dev panel inject canned chat conversations into the ChatDock so developers can style the chat panel without running a real LiveKit session.

**Architecture:** A small zustand store (`useChatMockStore`) holds an optional `ChatMessage[]`. The `ChatDockContainer` prefers the mock when set, falling back to `useChatTranscription`. The DevPanel grows a "chat" section (dropdown + Apply) that writes the selected mock and, if needed, also flips the view away from `start` so the dock mounts. In prod the store stays `null` (only the DevPanel writes it, and the panel is gated by `IN_DEVELOPMENT`).

**Tech Stack:** React 19, zustand 5 (already in `lib/agent-ui/ui-view-store.ts`), Next.js, vitest.

**Spec:** `docs/superpowers/specs/2026-05-27-chat-mocks-design.md`

---

## Task 1: Create the chat mock store

**Files:**
- Create: `lib/dev/chat-mock-store.ts`

The store holds `messages: ChatMessage[] | null`. `null` means "no mock active" — container falls through to live transcription. An empty array `[]` is a valid mock (empty conversation) and DOES override live messages.

- [ ] **Step 1: Create the store file**

Create `lib/dev/chat-mock-store.ts` with this exact content:

```ts
'use client';

import { create } from 'zustand';
import type { ChatMessage } from '@/lib/chat/messages';

type ChatMockState = {
  messages: ChatMessage[] | null;
  setMessages: (next: ChatMessage[] | null) => void;
};

export const useChatMockStore = create<ChatMockState>((set) => ({
  messages: null,
  setMessages: (next) => set({ messages: next }),
}));

export const useDevChatMessages = () => useChatMockStore((s) => s.messages);
export const useSetDevChatMessages = () => useChatMockStore((s) => s.setMessages);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors. Pre-existing unrelated error in `components/chat/chat.tsx` may persist; do not touch it.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/dev/chat-mock-store.ts
git commit -m "feat(dev): add chat mock store"
```

---

## Task 2: Create the chat mocks dataset

**Files:**
- Create: `lib/dev/chat-mocks.ts`

Four entries: `empty`, `short`, `long-scroll`, `streaming`. The `streaming` mock has `streaming: true` on the last agent message so the pulsing `…` indicator renders. The `long-scroll` mock has 12 alternating messages, mixing short and multi-line content to exercise scroll, top fade, and auto-scroll.

- [ ] **Step 1: Create the mocks file**

Create `lib/dev/chat-mocks.ts` with this exact content:

```ts
import type { ChatMessage } from '@/lib/chat/messages';

export type ChatMock = {
  id: string;
  label: string;
  messages: ChatMessage[];
};

export const CHAT_MOCKS: ChatMock[] = [
  {
    id: 'empty',
    label: 'Empty',
    messages: [],
  },
  {
    id: 'short',
    label: 'Short (3 turns)',
    messages: [
      { id: 'short-1', role: 'agent', content: 'Hola, ¿en qué te ayudo?' },
      { id: 'short-2', role: 'user', content: 'Quiero reservar una sesión.' },
      { id: 'short-3', role: 'agent', content: 'Perfecto, ¿para qué día la querés?' },
    ],
  },
  {
    id: 'long-scroll',
    label: 'Long (scroll)',
    messages: [
      { id: 'long-1', role: 'agent', content: 'Hola, soy el asistente de Riverside.' },
      { id: 'long-2', role: 'user', content: '¿Qué servicios ofrecen?' },
      {
        id: 'long-3',
        role: 'agent',
        content:
          'Ofrecemos grabación de podcast, edición de video y producción remota.\nCada uno tiene planes mensuales y por proyecto.',
      },
      { id: 'long-4', role: 'user', content: 'Contame del de podcast.' },
      {
        id: 'long-5',
        role: 'agent',
        content:
          'El plan de podcast incluye grabación multi-pista, transcripción automática y exportación en alta calidad.',
      },
      { id: 'long-6', role: 'user', content: '¿Cuánto sale?' },
      { id: 'long-7', role: 'agent', content: 'Empieza en USD 15/mes para el plan básico.' },
      { id: 'long-8', role: 'user', content: 'Mostrame los otros planes.' },
      {
        id: 'long-9',
        role: 'agent',
        content:
          'Tenemos tres niveles:\n• Básico — USD 15/mes\n• Pro — USD 24/mes\n• Business — USD 49/mes',
      },
      { id: 'long-10', role: 'user', content: 'Quiero probar el Pro.' },
      {
        id: 'long-11',
        role: 'agent',
        content: 'Genial. Te abro el flujo de checkout para el plan Pro.',
      },
      { id: 'long-12', role: 'user', content: 'Dale, gracias.' },
    ],
  },
  {
    id: 'streaming',
    label: 'Streaming in progress',
    messages: [
      { id: 'stream-1', role: 'user', content: '¿Cómo funciona el booking?' },
      {
        id: 'stream-2',
        role: 'agent',
        content: 'Estoy procesando tu sol',
        streaming: true,
      },
    ],
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/dev/chat-mocks.ts
git commit -m "feat(dev): add chat conversation mocks"
```

---

## Task 3: Add the chat section to the DevPanel

**Files:**
- Modify: `lib/dev/dev-panel.tsx`

Append a "chat" section after booking summary. `Apply chat` writes the chosen mock, opens the panel via the same `sessionStorage` key that `chat-dock.tsx` uses (`'chat:dock:open'`), and — only if `view.type === 'start'` — also applies the panel's currently selected view mock so the dock mounts. The existing `Reset` button is extended to also clear the chat mock.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `lib/dev/dev-panel.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  useSetBookingSummaryFromDev,
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { useSetDevChatMessages } from './chat-mock-store';
import { CHAT_MOCKS } from './chat-mocks';
import { BOOKING_SUMMARY_MOCKS, VIEW_MOCKS } from './mocks';

const VIEW_TYPES = Object.keys(VIEW_MOCKS) as UiView['type'][];
const CHAT_DOCK_OPEN_KEY = 'chat:dock:open';

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const view = useUiView();
  const source = useUiSource();
  const lastError = useUiLastError();
  const setViewFromDev = useSetViewFromDev();
  const setBookingSummaryFromDev = useSetBookingSummaryFromDev();
  const setDevChatMessages = useSetDevChatMessages();

  const [type, setType] = useState<UiView['type']>(view.type);
  const mocks = VIEW_MOCKS[type];
  const [mockId, setMockId] = useState(mocks[0]?.id ?? '');

  const [summaryMockId, setSummaryMockId] = useState(BOOKING_SUMMARY_MOCKS[0]?.id ?? '');
  const [chatMockId, setChatMockId] = useState(CHAT_MOCKS[0]?.id ?? '');

  useEffect(() => {
    setType(view.type);
    setMockId(VIEW_MOCKS[view.type][0]?.id ?? '');
  }, [view.type]);

  const applyView = () => {
    const chosen = mocks.find((m) => m.id === mockId) ?? mocks[0];
    if (chosen) setViewFromDev(chosen.view);
  };

  const applySummary = () => {
    const chosen =
      BOOKING_SUMMARY_MOCKS.find((m) => m.id === summaryMockId) ?? BOOKING_SUMMARY_MOCKS[0];
    if (chosen) setBookingSummaryFromDev(chosen.summary);
  };

  const applyChat = () => {
    const chosen = CHAT_MOCKS.find((m) => m.id === chatMockId) ?? CHAT_MOCKS[0];
    if (!chosen) return;
    setDevChatMessages(chosen.messages);
    if (view.type === 'start') applyView();
    try {
      window.sessionStorage.setItem(CHAT_DOCK_OPEN_KEY, JSON.stringify(true));
    } catch {}
  };

  const reset = () => {
    setViewFromDev({ type: 'start' });
    setDevChatMessages(null);
  };

  return (
    <div className="fixed right-3 bottom-3 z-[100] font-mono text-xs">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-black/80 px-2 py-1 text-white"
        >
          dev
        </button>
      )}
      {open && (
        <div className="w-72 space-y-2 rounded-md bg-black/80 p-3 text-white">
          <div className="flex items-center justify-between">
            <span>UI dev panel</span>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
          <div>
            current: <b>{view.type}</b> (source: {source})
          </div>
          <label className="block">
            view
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as UiView['type'];
                setType(nextType);
                setMockId(VIEW_MOCKS[nextType][0]?.id ?? '');
              }}
            >
              {VIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={mockId}
              onChange={(e) => setMockId(e.target.value)}
            >
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyView}
              className="flex-1 rounded bg-white text-black"
            >
              Apply view
            </button>
            <button type="button" onClick={reset} className="rounded bg-white/20 px-2 text-white">
              Reset
            </button>
          </div>

          <div className="mt-2 border-t border-white/20 pt-2">booking summary</div>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={summaryMockId}
              onChange={(e) => setSummaryMockId(e.target.value)}
            >
              {BOOKING_SUMMARY_MOCKS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applySummary}
            className="w-full rounded bg-white text-black"
          >
            Apply summary
          </button>

          <div className="mt-2 border-t border-white/20 pt-2">chat</div>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={chatMockId}
              onChange={(e) => setChatMockId(e.target.value)}
            >
              {CHAT_MOCKS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applyChat}
            className="w-full rounded bg-white text-black"
          >
            Apply chat
          </button>

          {lastError && (
            <div className="rounded bg-red-900/60 p-1">last error: {lastError.message}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/dev/dev-panel.tsx
git commit -m "feat(dev): add chat section to dev panel"
```

---

## Task 4: Wire `ChatDockContainer` to prefer mock messages

**Files:**
- Modify: `components/layout/app.tsx`

`ChatDockInner` is collapsed into `ChatDockContainer` so we can read both the live transcription and the mock store from one component (hook order stays stable, early return happens after both hooks). When `useDevChatMessages()` is non-null, it wins.

- [ ] **Step 1: Edit the container**

In `components/layout/app.tsx`, replace this block (lines 30–39 today):

```tsx
function ChatDockInner() {
  const { messages, sendMessage } = useChatTranscription();
  return <ChatDock messages={messages} onSubmit={sendMessage} />;
}

function ChatDockContainer() {
  const view = useUiView();
  if (view.type === 'start') return null;
  return <ChatDockInner />;
}
```

with:

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

- [ ] **Step 2: Add the import**

In the same file, add this import alongside the other `@/lib/dev/...` import:

```tsx
import { useDevChatMessages } from '@/lib/dev/chat-mock-store';
```

Keep the existing `import { DevPanel } from '@/lib/dev/dev-panel';` line as-is.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (same count as `main`). No new tests added in this plan.

- [ ] **Step 6: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(chat): prefer mock messages in ChatDockContainer"
```

---

## Manual verification (after Task 4)

Per the user's standing preference (auto-memory), do **not** open Playwright/Chrome unless explicitly asked. Hand off with:

> "Done. Run `pnpm dev`, open the app, click `dev` in the bottom-right.
> 1. Pick a chat mock (Empty / Short / Long / Streaming) and click **Apply chat** — the chat dock should appear (view also flips off `start` automatically) and the panel opens with the canned conversation. Long mock should scroll; Streaming mock should pulse `…` on the last agent bubble.
> 2. Click **Reset** — view returns to `start`, mock cleared. Re-enter a call → live transcription works as before."
