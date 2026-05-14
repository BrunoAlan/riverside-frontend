# Chat Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimalist `Chat` component (no-bubble, user in foreground / agent in muted-foreground, internal scroll, optional thinking indicator) along with two message primitives, all decoupled from LiveKit, and showcase them in the design-system page.

**Architecture:** Three new files in `components/chat/`. Two message primitives (`ChatUserMessage`, `ChatAgentMessage`) — tiny, single-responsibility components that render a styled `<p>`. One wrapper `Chat` — consumes `messages: ChatMessage[]` + `agentThinking?`, renders inside the existing `Conversation`/`ConversationContent` from `components/ai-elements/conversation.tsx` (which provides scroll + stick-to-bottom), and uses `AgentChatIndicator` from `components/agents-ui/` for the thinking state. LiveKit-agnostic: consumer maps `ReceivedMessage[]` to the component's own shape.

**Tech Stack:** Next.js 15, React 19, Tailwind, `lucide-react`, `motion/react` (already a dep, used by AgentChatTranscript), `use-stick-to-bottom` (transitive via Conversation), shadcn-style primitives.

**Spec:** `docs/superpowers/specs/2026-05-14-chat-component-design.md`

**Important:** No unit-test framework in this repo. Verification is typecheck + lint + browser-based in the design-system page.

---

## Task 1: Create the two message primitives

**Files:**
- Create: `components/chat/chat-user-message.tsx`
- Create: `components/chat/chat-agent-message.tsx`

- [ ] **Step 1: Create `chat-user-message.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatUserMessageProps = {
  children: React.ReactNode;
  className?: string;
};

function ChatUserMessage({ children, className }: ChatUserMessageProps) {
  return (
    <p
      data-slot="chat-user-message"
      className={cn(
        'text-foreground text-base leading-relaxed whitespace-pre-wrap',
        className
      )}
    >
      {children}
    </p>
  );
}

export { ChatUserMessage };
```

- [ ] **Step 2: Create `chat-agent-message.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

export type ChatAgentMessageProps = {
  children: React.ReactNode;
  className?: string;
};

function ChatAgentMessage({ children, className }: ChatAgentMessageProps) {
  return (
    <p
      data-slot="chat-agent-message"
      className={cn(
        'text-muted-foreground text-base leading-relaxed whitespace-pre-wrap',
        className
      )}
    >
      {children}
    </p>
  );
}

export { ChatAgentMessage };
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-user-message.tsx components/chat/chat-agent-message.tsx
git commit -m "feat(chat): add ChatUserMessage and ChatAgentMessage primitives"
```

---

## Task 2: Create the `Chat` wrapper

**Files:**
- Create: `components/chat/chat.tsx`

- [ ] **Step 1: Create `chat.tsx`**

```tsx
'use client';

import * as React from 'react';
import { AnimatePresence } from 'motion/react';
import { AgentChatIndicator } from '@/components/agents-ui/agent-chat-indicator';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { ChatAgentMessage } from '@/components/chat/chat-agent-message';
import { ChatUserMessage } from '@/components/chat/chat-user-message';

export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

export type ChatProps = {
  messages: ChatMessage[];
  agentThinking?: boolean;
  className?: string;
};

function Chat({ messages, agentThinking = false, className }: ChatProps) {
  return (
    <Conversation className={className}>
      <ConversationContent>
        {messages.map((message) =>
          message.role === 'user' ? (
            <ChatUserMessage key={message.id}>{message.content}</ChatUserMessage>
          ) : (
            <ChatAgentMessage key={message.id}>{message.content}</ChatAgentMessage>
          )
        )}
        <AnimatePresence>
          {agentThinking && <AgentChatIndicator size="sm" />}
        </AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export { Chat };
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat.tsx
git commit -m "feat(chat): add Chat conversation wrapper"
```

---

## Task 3: Add Chat demos to design-system page

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Import `Chat` and its message type**

In `app/(design-system)/design-system/page.tsx`, locate the existing import line `import { ChatInput } from '@/components/chat/chat-input';` and add this line right after it:

```tsx
import { Chat, type ChatMessage } from '@/components/chat/chat';
```

- [ ] **Step 2: Add mock messages constant**

In `app/(design-system)/design-system/page.tsx`, just above the `export default function DesignSystemPage()` declaration, insert this constant:

```tsx
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: "And what's a typical day like? I don't want to feel rushed.",
  },
  {
    id: '2',
    role: 'agent',
    content:
      'Mornings ashore, lunch back on board, and the afternoons are yours. Some guests head out again; most rest, read, or watch the valley go by. Evenings are exquisite culinary experiences, often with live music.',
  },
  {
    id: '3',
    role: 'user',
    content: 'Sounds perfect.\n\nIs there Wi-Fi on board?',
  },
  {
    id: '4',
    role: 'agent',
    content:
      'Yes, complimentary Wi-Fi throughout the ship. Speeds vary by location but most guests find it sufficient for messaging and light browsing.',
  },
];
```

- [ ] **Step 3: Restructure the existing Chat section to include Composer + Conversation subgroups**

In `app/(design-system)/design-system/page.tsx`, find the existing `<Section id="chat" title="Chat" description="Composer for chat surfaces.">` block and replace the ENTIRE Section (opening tag through closing `</Section>`) with:

```tsx
<Section id="chat" title="Chat" description="Composer and conversation surfaces.">
  <div className="max-w-2xl space-y-8">
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Composer — empty (placeholder)</h3>
      <ChatInput
        placeholder="Type here to exit voice mode..."
        onSubmit={(text) => toast(`Sent: ${text}`)}
      />
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Composer — with text</h3>
      <ChatInput defaultValue="Typin" onSubmit={(text) => toast(`Sent: ${text}`)} />
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Composer — disabled</h3>
      <ChatInput
        placeholder="Disabled while the agent is responding..."
        disabled
        onSubmit={(text) => toast(`Sent: ${text}`)}
      />
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Conversation</h3>
      <div className="bg-card h-80 rounded-2xl border">
        <Chat messages={SAMPLE_MESSAGES} />
      </div>
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Conversation — agent thinking</h3>
      <div className="bg-card h-80 rounded-2xl border">
        <Chat messages={SAMPLE_MESSAGES} agentThinking />
      </div>
    </div>
  </div>
</Section>
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(design-system)/design-system/page.tsx"
git commit -m "docs(design-system): showcase Chat conversation in Chat section"
```

---

## Task 4: Browser verification

**Files:** none (manual verification)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server starts (typically `http://localhost:3000` or `:3001` if 3000 is in use). Note the actual port from the output.

- [ ] **Step 2: Open the design-system page**

Navigate to `http://localhost:<port>/design-system#chat`.

- [ ] **Step 3: Verify the Chat section structure**

Confirm the section now contains 5 subgroups in this order:
1. Composer — empty (placeholder) — existing ChatInput, untouched
2. Composer — with text — existing ChatInput, untouched
3. Composer — disabled — existing ChatInput, untouched
4. Conversation — new Chat with 4 messages
5. Conversation — agent thinking — same 4 messages plus thinking indicator

- [ ] **Step 4: Verify the Conversation demo**

In subgroup 4 ("Conversation"):
- The container is a card with `h-80` (fixed height ~320px) and a border.
- Four messages render in order:
  1. User: "And what's a typical day like? I don't want to feel rushed." — black/foreground color, no bubble.
  2. Agent: "Mornings ashore, lunch back on board, ..." — muted grey color, no bubble.
  3. User: "Sounds perfect." then a blank line then "Is there Wi-Fi on board?" — proves `whitespace-pre-wrap` works.
  4. Agent: "Yes, complimentary Wi-Fi throughout the ship. ..." — muted grey.
- Visual matches the design mock: no bubbles, text-base size, generous spacing.

- [ ] **Step 5: Verify scroll behavior**

In subgroup 4:
- The 4 mock messages plus default `gap-8 p-4` padding should exceed the `h-80` container — scroll should be available.
- Scroll to the top → a circular `ArrowDown` button appears at the bottom-center of the container (rendered by `ConversationScrollButton`).
- Click the button → smoothly scrolls back to bottom; button disappears.

- [ ] **Step 6: Verify the agent-thinking demo**

In subgroup 5 ("Conversation — agent thinking"):
- Same 4 messages render.
- At the end of the list, the `AgentChatIndicator` (animated dots/pulse) is visible.
- The indicator is positioned after the last agent message.

- [ ] **Step 7: Stop the dev server**

Ctrl+C in the dev server terminal.

- [ ] **Step 8: Final commit (only if verification surfaced changes)**

If verification surfaced issues, fix them, then commit. Otherwise this task has no commit.
