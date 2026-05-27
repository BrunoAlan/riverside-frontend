# Chat Overlay Restyle — Design

Date: 2026-05-27
Branch: `feat/chat-overlay`

## Problem

The chat overlay (`components/chat/chat-overlay.tsx`) currently renders the last
user and last agent message as plain text floating over the visualizer. Three
issues:

1. **Legibility** — text sits directly on a moving gradient/visualizer, hard to
   read.
2. **No way to dismiss** — the messages are always visible; the user can't get
   them out of the way to see the canvas.
3. **Order feels wrong** — `lastUser` is always above `lastAgent`, regardless of
   which one arrived later. The most recent message should sit closest to the
   input (bottom).

## Goals

- Conversation lives inside a single, readable card with a glass background.
- The card can be collapsed/expanded manually with a chevron toggle.
- Messages are ordered chronologically inside the card, newest at the bottom.

## Non-goals

- No changes to `useChatTranscription`, message types, or the LiveKit transport.
- No changes to `ChatInput`.
- No per-message styling beyond color (no individual bubbles).
- No auto-reopen on new messages — collapse is a sticky manual state.

## Design

### Layout

```
┌──────────────────────────────── ▲ ┐   ← chevron toggle (top-right)
│ Hola ¿qué hacés?                  │
│                                   │
│ Todo bien, ¿vos?                  │
│                                   │
│ Quería armar mi agenda…           │
│                                   │
│ Dale, contame qué tenés.          │   ← last message, pinned to bottom
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ Type here to exit voice mode…     │
└───────────────────────────────────┘
```

- **Single card** wrapping the whole transcript. No per-message bubbles.
- **Background:** `bg-background/40 backdrop-blur-md`, rounded, subtle border
  (`border-white/10`), soft shadow.
- **Scroll:** the card has a max height (`max-h-[50vh]`); content overflows with
  internal scroll. Bottom-anchored — newest message visible by default.
- **Fade mask** at the top edge (the existing `linear-gradient(to top,
  black 60%, transparent)` mask) so older messages fade into the card edge.
- **Chevron toggle** at the top-right of the card area: `ChevronDown` when
  expanded (click → collapse), `ChevronUp` when collapsed (click → expand).
  Uses `lucide-react`. `pointer-events-auto`.

### Collapsed state

- Card is unmounted (not just hidden) — full visualizer visibility.
- Chevron stays where the card's top-right was, floating above the input.
- Input remains in place.

### Message rendering

- Show **all** messages from the `messages` prop in array order (oldest at top,
  newest at bottom). No more "last user + last agent" filtering.
- User vs agent differentiated only by text color (today's pattern):
  - User: `text-foreground`
  - Agent: `text-muted-foreground`
- `ChatUserMessage` / `ChatAgentMessage` stay as the rendering primitives. They
  remain plain `<p>` with text-color classes — no card chrome on them, because
  the card is now the parent. Existing per-message styling unchanged.

### State

Local to `ChatOverlay`:

```ts
const [collapsed, setCollapsed] = useState(false);
```

No persistence. No effect on new messages (manual toggle only).

### Files touched

| File                                | Change                                                 |
| ----------------------------------- | ------------------------------------------------------ |
| `components/chat/chat-overlay.tsx`  | Single-card layout, all messages, collapse toggle      |

`chat-user-message.tsx`, `chat-agent-message.tsx`, `chat-input.tsx`, the
transcription hook, and the mount sites are **not** changed.

### Accessibility

- The chevron button has `aria-label="Collapse chat" / "Expand chat"` and
  `aria-expanded` reflecting state.
- The card region uses `aria-live="polite"` so new messages are announced when
  the card is open.

## Verification

Manual: open any non-start view, talk to the agent, confirm:

1. Messages appear inside a glass card with all history, newest at the bottom.
2. Chevron collapses the card; input stays; chevron flips direction.
3. While collapsed, new messages do not reopen the card.
4. Expanding shows the updated transcript scrolled to the bottom.

No new tests required — this is presentation-only on an existing component.
