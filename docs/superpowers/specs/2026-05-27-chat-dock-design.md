# Chat Dock — Design

Date: 2026-05-27
Branch: `feat/chat-overlay`

## Problem

The current `ChatOverlay` (just landed) renders a single glass card with the
full transcript plus an input, gated only by a chevron above the card. There
are no in-conversation controls for ending the call or muting the mic — those
actions are reachable only through dev tools or by reloading. We also want the
chat panel itself to be hidden by default, opt-in via a button, so the
visualizer stays unobstructed during voice mode.

Specifically:

1. **No call controls.** Users have no UI to end the call or mute the mic mid-conversation.
2. **Chat is always visible.** The transcript card shows even when the user
   doesn't need it.
3. **Two-level control missing.** Today there's one collapse (whole card). The
   target design has two: hide the whole panel (floating button) AND collapse
   just the transcript while keeping the input (header chevron).

## Goals

- A vertical stack of 3 floating circular controls (end call, mic toggle, chat
  toggle) shown whenever a conversation is active.
- A chat panel (header + transcript + input) that overlays the visualizer,
  toggled by the chat button, closed by default.
- Inside the panel, a header chevron collapses/expands only the transcript;
  the input stays visible.
- Panel open/closed state persists in `sessionStorage` (same tab survives
  re-mounts).

## Non-goals

- No changes to `useChatTranscription`, `ChatMessage` types, or the LiveKit
  transport layer in `lib/agent-ui/transport.ts`.
- No changes to `ChatInput`, `ChatUserMessage`, `ChatAgentMessage`.
- No confirmation dialog before ending the call.
- No auto-open of the panel on new messages.
- No keyboard shortcuts.
- No new tests beyond what already exists (presentation/integration change).

## Design

### Layout

```
                                  ┌──────────────────────────────┐
                                  │ Conversation history       ▲ │   ← header + chevron
                                  ├──────────────────────────────┤
                                  │ Hola, ¿qué hacés?            │   ← transcript
                                  │ Todo bien, ¿vos?             │     (collapsible)
                                  │ …                            │
                                  ├──────────────────────────────┤
   ⓧ      (PhoneOff)              │ Type here to exit voice…   ➤ │   ← input
   🎤     (Mic / MicOff)          └──────────────────────────────┘
   💬     (MessageSquare, active)
```

- Controls column anchored bottom-left (`absolute bottom-4 left-4`).
- Panel anchored to the right of the column, same vertical baseline
  (`absolute bottom-4 left-16` approx — adjacent, not overlapping).
- Panel width `w-[360px]`, max-height `max-h-[60vh]`.
- Background of panel: `bg-background/40 backdrop-blur-md` with `border-white/10`,
  `rounded-2xl`, soft shadow. Same glass treatment for buttons.

### Components

| Component                                | Responsibility |
| ---------------------------------------- | -------------- |
| `components/chat/chat-controls.tsx`      | Vertical column of 3 circular floating buttons. No state of its own beyond local `isMuted` derived from LiveKit hooks. |
| `components/chat/chat-overlay.tsx`       | Just the panel: header bar (title + chevron), transcript region, input. Receives `messages`, `onSubmit`, `transcriptCollapsed`, `onToggleTranscript`. No outer open/closed gating. |
| `components/chat/chat-dock.tsx`          | Container. Owns `isChatOpen` / `isTranscriptCollapsed` (persisted via `sessionStorage`). Renders `ChatControls` always, renders `ChatOverlay` only when open. Wires `onToggleChat` and `onEndCall` callbacks. |
| `components/layout/app.tsx`              | Replaces `<ChatOverlayContainer />` with `<ChatDockContainer />` that does the same view-gating + transcription wiring. |

### Controls behavior

- **End call**: `useSessionContext().end()`. Red/destructive variant. Tooltip / `aria-label="End call"`. Icon: `lucide-react/PhoneOff`.
- **Mic toggle**: uses LiveKit `useTrackToggle({ source: Track.Source.Microphone })`. Icon switches between `Mic` and `MicOff`. `aria-label` reflects state. Starts unmuted (LiveKit default once the session starts).
- **Chat toggle**: toggles `isChatOpen` on the parent. Active styling when open (`bg-foreground text-background`); inactive uses same glass treatment as the others. Icon: `MessageSquare`. `aria-pressed={isChatOpen}`.
- All buttons: `size-10` circular, `pointer-events-auto`, `backdrop-blur-md`, subtle border.

### Panel behavior

- Rendered only when `isChatOpen === true`.
- Header row inside the panel:
  - Left: text "Conversation history" (small, `text-sm font-medium`).
  - Right: chevron button — `ChevronUp` when transcript shown (click collapses), `ChevronDown` when collapsed (click expands). `aria-expanded` reflects state.
- Transcript region: renders only when `isTranscriptCollapsed === false`. Same internals as today (messages mapped to `ChatUserMessage`/`ChatAgentMessage`, scroll-to-bottom on update, `linear-gradient` top fade mask, `aria-live="polite"`).
- Input: always rendered while panel is open.
- Closing the panel via chat button does not reset `isTranscriptCollapsed`.

### State and persistence

Owned by `ChatDock`:

```ts
const [isChatOpen, setIsChatOpen] = useSessionStorageState('chat:dock:open', false);
const [isTranscriptCollapsed, setIsTranscriptCollapsed] =
  useSessionStorageState('chat:dock:transcript-collapsed', false);
```

`useSessionStorageState` is a small co-located hook in `components/chat/chat-dock.tsx` (or `lib/chat/use-session-storage-state.ts` if preferred). Behaves like `useState<boolean>` with read/write on `sessionStorage`, SSR-safe (initial render uses default; effect syncs on mount).

No persistence for mute state — LiveKit owns it.

### Mounting

`app.tsx` keeps its existing pattern:

```tsx
function ChatDockContainer() {
  const view = useUiView();
  const { messages, sendMessage } = useChatTranscription();
  if (view.type === 'start') return null;
  return <ChatDock messages={messages} onSubmit={sendMessage} />;
}
```

### Accessibility

- Each button: explicit `aria-label`. Chat toggle: `aria-pressed`. Header chevron: `aria-expanded` and `aria-controls="chat-transcript"`.
- Panel transcript: `aria-live="polite"` (unchanged).
- Tab order: end → mute → chat (left column), then header chevron, then transcript, then input.

### Files touched

| File                                | Change   |
| ----------------------------------- | -------- |
| `components/chat/chat-dock.tsx`     | Create   |
| `components/chat/chat-controls.tsx` | Create   |
| `components/chat/chat-overlay.tsx`  | Rewrite (becomes panel-only, no own open/close chevron) |
| `components/layout/app.tsx`         | Swap `ChatOverlayContainer` for `ChatDockContainer` |

`chat-user-message.tsx`, `chat-agent-message.tsx`, `chat-input.tsx`, `useChatTranscription`, and the transport remain unchanged.

## Verification

Manual, on a running dev server (no Playwright unless requested):

1. Start a call → 3 circular buttons appear bottom-left; panel is **closed**.
2. Click chat button → panel appears to the right; chat button shows active state.
3. Send a message → transcript shows it; auto-scrolls to bottom.
4. Click header chevron → transcript collapses, input stays; chevron flips.
5. Click chat button again → whole panel disappears; controls remain.
6. Reload tab → if panel was open, it stays open (sessionStorage). If it was closed, stays closed.
7. Click mic button → icon toggles `Mic` ↔ `MicOff`; LiveKit local track mute flips.
8. Click end-call button → session disconnects; UI returns to start view.

No new tests required — change is presentation + thin wiring to existing LiveKit hooks. Existing test suite must still pass.
