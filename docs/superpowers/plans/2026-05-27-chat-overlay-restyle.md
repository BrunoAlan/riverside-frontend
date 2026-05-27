# Chat Overlay Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-message rendering in `chat-overlay.tsx` with a single glass card containing the full transcript (newest at bottom), plus a manual chevron toggle to collapse/expand.

**Architecture:** Presentation-only change to one component (`components/chat/chat-overlay.tsx`). Local `useState` drives a collapse toggle. Messages render in array order inside a single glass-styled container. No changes to hooks, types, transport, or message primitives.

**Tech Stack:** React 19, Next.js, Tailwind, `lucide-react` (ChevronDown/ChevronUp), existing `ChatUserMessage` / `ChatAgentMessage` / `ChatInput` primitives.

**Spec:** `docs/superpowers/specs/2026-05-27-chat-overlay-restyle-design.md`

---

## Task 1: Rewrite `ChatOverlay` as a single-card transcript with collapse toggle

**Files:**
- Modify: `components/chat/chat-overlay.tsx` (full file rewrite, ~70 LOC)

The current file renders only `lastUser` + `lastAgent` as bare text under a fade
mask. The new version:

- Maps over **all** `messages` in order, picking `ChatUserMessage` or
  `ChatAgentMessage` per `role`.
- Wraps the list in a single glass card (`bg-background/40 backdrop-blur-md`
  + rounded + border + shadow).
- Adds a `collapsed` state with a chevron button (top-right). Collapsed →
  card unmounts, only chevron + input remain.
- Keeps the existing top fade mask on the messages container so older
  messages fade into the card edge.
- Auto-scrolls the messages container to the bottom on mount and whenever
  `messages` changes, so the newest message is always in view.

### Step 1: Replace the file contents

- [ ] **Step 1: Write the new `ChatOverlay`**

Replace the entire contents of `components/chat/chat-overlay.tsx` with:

```tsx
'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatUserMessage } from '@/components/chat/chat-user-message';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/lib/chat/messages';
import { cn } from '@/lib/shadcn/utils';

export type ChatOverlayProps = {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  className?: string;
};

const fadeMask = 'linear-gradient(to top, black 60%, transparent)';

function ChatOverlay({ messages, onSubmit, className }: ChatOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, collapsed]);

  const hasMessages = messages.length > 0;

  return (
    <div
      data-slot="chat-overlay"
      className={cn(
        'pointer-events-none absolute bottom-4 left-4 z-20 flex w-[360px] flex-col gap-2',
        className
      )}
    >
      {hasMessages ? (
        <div className="relative flex justify-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
            aria-expanded={!collapsed}
            className="pointer-events-auto bg-background/40 backdrop-blur-md border border-white/10 size-7 rounded-full"
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      ) : null}

      {!collapsed && hasMessages ? (
        <div
          aria-live="polite"
          className="bg-background/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm"
        >
          <div
            ref={scrollRef}
            className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-3 py-3"
            style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <ChatUserMessage key={m.id}>{m.content}</ChatUserMessage>
              ) : (
                <ChatAgentMessage key={m.id}>{m.content}</ChatAgentMessage>
              )
            )}
          </div>
        </div>
      ) : null}

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

**Notes for the implementer:**

- `ChatMessage` exposes `id`, `role` (`'user' | 'agent'`), and `content`. If
  `id` is not present on the type, check `lib/chat/messages.ts` and use whatever
  unique field exists (don't fall back to array index — messages can re-render).
- The chevron container only renders when there are messages, so an empty
  conversation shows just the input.
- The card is unmounted when collapsed (not just `hidden`) — fully out of the
  DOM, matching the spec ("máxima visibilidad del visualizer").

- [ ] **Step 2: Verify `ChatMessage` has an `id` field**

Run: `rg "^export (type|interface) ChatMessage" lib/chat`

Expected: a type with at least `id`, `role`, `content`. If `id` is missing,
adjust the `key` in the `.map` to whatever stable identifier the type provides.
Do not introduce array-index keys.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`

Expected: no errors. If `ChatMessage` lacks `id`, fix the key choice and rerun.

- [ ] **Step 4: Lint**

Run: `pnpm lint`

Expected: no errors in `components/chat/chat-overlay.tsx`.

- [ ] **Step 5: Run existing tests**

Run: `pnpm test`

Expected: all pre-existing tests still pass. This component had no co-located
test file before the change; none is being added (presentation-only change on
an isolated component, per the spec's "Verification" section).

- [ ] **Step 6: Commit**

```bash
git add components/chat/chat-overlay.tsx
git commit -m "feat(chat): single glass card transcript with collapse toggle"
```

---

## Manual verification (after Task 1)

The user has a standing preference against unprompted browser verification (see
auto-memory). Do **not** open Playwright/Chrome unless explicitly asked. Instead,
present the changes and let the user verify in their running dev server.

Hand off with:

> "Done. Open any non-start view, send a couple of messages, and check:
> (1) glass card with full transcript, newest pinned to the bottom;
> (2) chevron collapses → only chevron + input remain;
> (3) while collapsed, new messages do not reopen the card;
> (4) expanding shows the transcript scrolled to bottom."
