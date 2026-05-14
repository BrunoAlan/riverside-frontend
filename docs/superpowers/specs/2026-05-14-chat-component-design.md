# Chat Component — Design Spec

**Date:** 2026-05-14
**Status:** Approved (pending user review of this document)

## Purpose

A `Chat` component that displays a conversation between the user and the agent in a minimalist no-bubble style: user messages in foreground color, agent messages in muted-foreground color. Used as the conversation surface in chat screens. LiveKit-agnostic: the consumer maps `ReceivedMessage[]` to the component's own `ChatMessage[]` shape so the UI stays decoupled from the SDK and can be showcased with mock data.

## Location

Inside the existing `components/chat/` folder:

- `components/chat/chat.tsx` — wrapper that takes `messages` and renders the list with internal scroll.
- `components/chat/chat-user-message.tsx` — primitive for a single user message.
- `components/chat/chat-agent-message.tsx` — primitive for a single agent message.

`components/chat/chat-input.tsx` already exists and is unaffected.

## Composition

Built from existing primitives and utilities:

- `Conversation`, `ConversationContent`, `ConversationScrollButton` from `components/ai-elements/conversation.tsx` — provides the scrollable container with stick-to-bottom behavior (via `use-stick-to-bottom`).
- `AgentChatIndicator` from `components/agents-ui/agent-chat-indicator.tsx` — used for the thinking indicator.
- `AnimatePresence` from `motion/react` — for indicator enter/exit animation, matching the existing `AgentChatTranscript` pattern.
- `cn` from `@/lib/shadcn/utils`.

All three files are `'use client'` (animation + scroll hooks require it).

## Public API

```ts
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

export type ChatUserMessageProps = {
  children: React.ReactNode;
  className?: string;
};

export type ChatAgentMessageProps = {
  children: React.ReactNode;
  className?: string;
};
```

`Chat`, `ChatUserMessage`, and `ChatAgentMessage` are all named exports. The two primitives are exported so consumers can compose manually if they need to, but the typical usage is `<Chat messages={...} />`.

## Behavior

### Rendering

- The wrapper renders inside `<Conversation>` + `<ConversationContent>`, which gives:
  - `flex-1 overflow-y-hidden` container
  - Stick-to-bottom scroll behavior
  - Smooth scroll-to-bottom when new messages arrive
- Messages are rendered in order with `<ConversationContent>`'s existing `gap-8 p-4`.
- For each message, switch on `role`:
  - `'user'` → render `<ChatUserMessage>{content}</ChatUserMessage>`
  - `'agent'` → render `<ChatAgentMessage>{content}</ChatAgentMessage>`
- A `<ConversationScrollButton />` is rendered (already styled in the ai-elements primitive) so the user can jump back to the bottom if they scrolled up.

### Thinking indicator

- When `agentThinking` is `true`, render `<AgentChatIndicator size="sm" />` at the end of the list, wrapped in `<AnimatePresence>` so it animates in and out.
- When `agentThinking` is `false` or undefined, no indicator renders.
- This mirrors how `AgentChatTranscript` already uses `AgentChatIndicator`.

### Content rendering

- Plain text only. Each message renders its `content` as a `<p>` inside the primitive.
- The `<p>` uses `whitespace-pre-wrap` to preserve newlines in the source string. No markdown parsing, no streaming-specific logic.

## Styling

### `ChatUserMessage`

```
text-foreground text-base leading-relaxed whitespace-pre-wrap
```

No background, no padding, no border. Just text.

### `ChatAgentMessage`

```
text-muted-foreground text-base leading-relaxed whitespace-pre-wrap
```

Same shape as the user message but the color is muted to match the mock.

### `Chat` wrapper

The wrapper itself adds no new classes beyond what `Conversation`/`ConversationContent` already provide. The `className` prop is forwarded to the outer `Conversation`.

All colors come from existing semantic tokens (`foreground`, `muted-foreground`). No new tokens.

## Showcase

Extend the existing `Section id="chat"` in `app/(design-system)/design-system/page.tsx`. The current section only contains `ChatInput` demos. Reorganize it into two subgroups:

1. **Composer** — the existing `ChatInput` demos (Empty / With text / Disabled).
2. **Conversation** — new `Chat` demos:
   - Demo A: A short conversation (3-4 messages alternating user/agent) using mock content reminiscent of the design mock ("And what's a typical day like? ...").
   - Demo B: The same conversation but with `agentThinking` set to `true` to show the indicator at the end.
   - Both demos rendered inside a fixed-height container (e.g., `h-80`) so the internal scroll is visible.

No changes to `ShowcaseNav` are needed (the `chat` link already exists).

## Out of scope (v1)

Explicitly NOT included; add later when a real use case appears:

- Agent avatars / per-agent identity (the mock's cog icon — confirmed omitted).
- Markdown rendering (Streamdown). Plain text only for now.
- Streaming-specific affordances (per-token rendering, partial messages).
- Timestamps, message metadata, `from.identity` displays.
- Message actions (copy, regenerate, edit, branch selector).
- System messages, tool calls, attachments.
- Custom empty state. If `messages` is empty the container just renders the (empty) `<ConversationContent>` and the optional thinking indicator.
- Direct integration with LiveKit hooks. The consumer maps `ReceivedMessage[]` → `ChatMessage[]` and passes it in. The existing `AgentChatTranscript` (which is LiveKit-coupled and bubble-style) is left untouched.

## Acceptance criteria

- `<Chat messages={[]} />` renders an empty scrollable container with no console errors.
- Given a `messages` array, user messages appear in `text-foreground` and agent messages in `text-muted-foreground`, both `text-base`.
- A `content` string containing `\n` renders as multiple visual lines (whitespace-pre-wrap working).
- When a new message is appended, the scroll position sticks to the bottom (unless the user scrolled away — then `ConversationScrollButton` appears).
- With `agentThinking={true}`, `AgentChatIndicator` renders at the end of the list. Toggling it off animates the indicator out.
- The two demos render correctly in the design-system "Chat" section without layout regressions to the existing `ChatInput` showcase.
