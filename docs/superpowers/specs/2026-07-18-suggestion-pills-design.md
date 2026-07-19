# Suggestion pills

Floating, tappable prompt suggestions rendered above the booking summary. Tapping one sends its
text to the agent as if the user had typed it in the chat dock.

Frontend-only: no backend involvement, no new `UiCommand`, no change to the wire protocol.

## Goals

- A short row (or column) of suggested prompts, visible over the current view.
- Tapping a pill sends a chat message to the agent.
- The catalog is easy to extend, and each pill declares which views it appears on.

## Non-goals

- Backend- or agent-driven suggestions.
- Persisting dismissal across reloads or sessions.
- Analytics events, per-pill icons, entry/exit animation.

## Config

`lib/suggestions/pills.ts`

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type SuggestionPill = {
  id: string;
  /** Shown on the pill. */
  label: string;
  /** Sent to the agent. Defaults to `label`. */
  message?: string;
  /** Views this pill appears on. Omit to show it on every view. */
  views?: UiView['type'][];
};

export const SUGGESTION_PILLS: SuggestionPill[] = [
  {
    id: 'vienna-christmas',
    label: 'Plan a romantic Christmas getaway in Vienna',
    views: ['presentation', 'dream_stage'],
  },
  { id: 'budapest', label: 'Tell me about Budapest' },
  {
    id: 'river-vs-ocean',
    label: 'What makes river cruises different from ocean cruises?',
  },
];

export function pillsForView(viewType: UiView['type']): SuggestionPill[];
```

`pillsForView` is pure: it returns the pills whose `views` includes `viewType`, plus every pill
with no `views` field. Order follows the declaration order in `SUGGESTION_PILLS`.

Adding a pill is one array entry. Changing where a pill shows is an edit to its `views`.
`views` is typed against `UiView['type']`, so a typo or a removed view type is a compile error.

## Component

`components/agent-ui/suggestion-pills.tsx` exports two things.

**`SuggestionPills`** — presentational, no store access.

```ts
interface SuggestionPillsProps {
  pills: SuggestionPill[];
  stacked: boolean;
  onSelect: (pill: SuggestionPill) => void;
}
```

Each pill is a shadcn `Button` with the rounded-full chip styling already used by `Slot` in
`booking-summary.tsx` (`rounded-full`, `bg-card/95`, `backdrop-blur`, border).

Layout depends on `stacked`:

| `stacked` | Layout                                  | Matches   |
| --------- | --------------------------------------- | --------- |
| `true`    | `flex flex-col items-center gap-2`      | mockup 1  |
| `false`   | `flex flex-wrap justify-center gap-2`   | mockup 2  |

**`SuggestionPillsContainer`** — wiring. Reads the current view, derives the pill list, owns
dismissal state, and sends the message.

- `stacked` is `useBookingSummary() === null`.
- `pills` is `pillsForView(view.type)`.
- On select: `sendMessage(pill.message ?? pill.label)` from `useChatTranscriptionContext()` (see
  [Send path](#send-path) — the transcription hook is a single shared instance behind a provider).

### Dismissal

A `useState<string | null>` holds the `view.type` at which the row was dismissed. Tapping any pill
sets it to the current `view.type`, hiding the whole row. When `view.type` changes the stored value
no longer matches and the row reappears with that view's pills. If the send rejects, the dismissal
is rolled back (unless the view already changed) so a failed message does not strand the user with
no suggestions. Nothing is persisted and nothing is added to `uiViewStore`.

### Render gating

The container renders `null` when any of these hold:

1. `pillsForView(view.type)` is empty.
2. The row was dismissed at the current `view.type`.
3. The room is not connected.

Condition 3 matters because sending text requires a connected room: `sendMessage` calls
`localParticipant.sendText()`, which fails when the room has not connected yet. (Its own guard in
`hooks/use-chat-transcription.ts` checks only that a local participant object is *present* — that is
always true, since `Room.localParticipant` is non-optional and assigned in the `Room` constructor —
so it does not cover this case.) Before the user starts the session a pill tap would fail. The
container reads the live state with `useConnectionState()` from `@livekit/components-react` and
renders only when it equals `ConnectionState.Connected`, so a pill configured with `views: ['start']`
stays hidden until the room connects, then appears while still on `start`.

## Placement

`components/layout/app.tsx`, as a sibling in the existing flex column:

```jsx
  <div className="relative min-h-0 flex-1">
    <ViewController />
  </div>
  <SuggestionPillsContainer />
  <BookingSummaryContainer />
  <ChatDockContainer />
```

Normal flow layout, no absolute positioning. When the booking summary is absent the row sits in
the empty space above the chat dock; when it is present the row sits directly above the summary
card. The wrapper uses the same horizontal padding as `BookingSummaryContainer` (`px-18 pb-4`) so
the two align.

`ChatDock` is `absolute inset-0 z-20` inside the same flex column, and its `ChatOverlay` is an
opaque 360px panel anchored bottom-left. The wrapper is therefore `relative z-30` so pills always
paint above the dock and stay clickable, and from `xl` up it pads symmetrically by the full width of
that left lane (`xl:px-[26.5rem]` = `left-4` + controls + gap + 360px) so the centered row never
sits over the overlay. The padding is symmetric, so the row stays centered in the viewport.

## Send path

Identical to the chat dock's submit path: `localParticipant.sendText(text, { topic: 'lk.chat' })`
via `useChatTranscription`. The pill's text is appended to the transcript as a user message and the
agent replies as it would to typed input.

`useChatTranscription` must be a **single shared instance**, not called once per consumer. The hook
registers LiveKit text stream handlers for the `lk.chat` and `lk.transcription` topics, and
`Room.registerTextStreamHandler` throws (`A text stream handler for topic "lk.chat" has already been
set.`) when a topic already has a handler — so a second call in the same tree crashes at runtime.
Two instances would also split the transcript state, since each hook keeps its own `messages` and
LiveKit does not echo a participant's own text stream back to itself (which is why `sendMessage`
appends the sent message locally).

`components/layout/chat-transcription-context.tsx` therefore calls the hook once and exposes
`{ messages, sendMessage }` via context. `ChatTranscriptionProvider` is mounted in
`components/layout/app.tsx` inside `AgentSessionProvider` (the hook needs the LiveKit room context)
and wraps both `SuggestionPillsContainer` and `ChatDockContainer`; both read
`useChatTranscriptionContext()` instead of calling the hook.

## Testing

`lib/suggestions/pills.test.ts` — `pillsForView` returns view-scoped pills, includes pills with
no `views`, preserves declaration order, and returns `[]` for a view with no matches.

That is the only automated test. Vitest runs in the `node` environment with no jsdom or
testing-library, and the repo has no component tests today; adding that infrastructure is out of
scope here. Rendering, layout, dismissal, and room gating are verified manually, consistent with
how `BookingSummaryContainer` and `ChatDockContainer` are covered.

## Files

| File                                              | Change |
| ------------------------------------------------- | ------ |
| `lib/suggestions/pills.ts`                        | new    |
| `lib/suggestions/pills.test.ts`                   | new    |
| `components/agent-ui/suggestion-pills.tsx`        | new    |
| `components/layout/app.tsx`                       | edit   |
