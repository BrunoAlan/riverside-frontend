# ChatInput — Design Spec

**Date:** 2026-05-14
**Status:** Approved (pending user review of this document)

## Purpose

Build a `ChatInput` component: a rounded card containing a multiline text area and a paper-plane send button. The send button is visually disabled (secondary) when empty and enabled (primary) once the user types. Used as the user's message composer in chat surfaces.

## Location

- New folder: `components/chat/`
- File: `components/chat/chat-input.tsx`
- Export: `ChatInput` (named export)

`components/chat/` is the home for chat-specific components going forward (future: `ChatMessage`, `ChatHeader`, etc.).

## Visual reference

Two states from the mock:

1. **Empty / placeholder** — wrapper card with placeholder text (e.g. `"Type here to exit voice mode..."`), send button rendered in secondary (grey) styling and disabled.
2. **Typing** — same wrapper, user text rendered, send button enabled in primary (dark green) styling.

## Composition

Built entirely from existing primitives:

- `Textarea` from `components/ui/textarea.tsx`
- `Button` from `components/ui/button.tsx` (`size="icon"`)
- `Send` icon from `lucide-react`

Client component (`'use client'`) because it manages local state and keyboard handlers.

## Public API

```ts
type ChatInputProps = {
  value?: string;                    // controlled mode (optional)
  defaultValue?: string;             // initial value in uncontrolled mode
  onChange?: (value: string) => void;
  onSubmit: (text: string) => void;  // only required callback
  placeholder?: string;              // default: "Type a message..."
  disabled?: boolean;
  className?: string;                // applied to the wrapper
  autoFocus?: boolean;
};
```

### Controlled vs uncontrolled

- If `value` is `undefined`, the component is **uncontrolled**: internal state initialized with `defaultValue ?? ''`.
- If `value` is defined, the component is **controlled**: parent owns state via `onChange`.
- Both `value` and `defaultValue` together: `value` wins (uncontrolled mode is ignored). Match React's `<input>` convention.

## Behavior

### Submit

- Submit text is `currentValue.trim()`.
- If trimmed text is empty, submit is a no-op (button is disabled and Enter does nothing).
- On successful submit:
  - Uncontrolled mode: clear internal state to `''`.
  - Controlled mode: do not touch parent state. Parent is expected to reset by passing `''` back through `value`/`onChange` if desired.

### Keyboard

- `Enter` without modifiers → `preventDefault()` and submit.
- `Shift+Enter` → default textarea behavior (insert newline).
- `Enter` while button is disabled (empty text or `disabled` prop) → no-op.

### Send button enabled/disabled

The send button is disabled when **either**:

- `disabled` prop is `true`, OR
- `currentValue.trim()` is empty.

Visual mapping (controls variant):

- Enabled → `variant="default"` (primary; dark green from existing tokens).
- Disabled → `variant="secondary"` (light grey from existing tokens).

`aria-label="Send message"` on the button. Icon is `<Send />` from lucide-react.

### Auto-resize

The existing `Textarea` primitive already uses `field-sizing-content`. The composer overrides:

- `min-h-9` (single-line height baseline)
- `max-h-40` (cap growth ~6 lines, then internal scroll)
- `resize-none overflow-y-auto`

### Disabled prop

When `disabled` is true:

- Textarea is disabled (no typing, no focus interactions).
- Send button is disabled.
- Wrapper retains its border/background — no separate "disabled wrapper" treatment for v1.

## Styling

Wrapper:

```
rounded-2xl border bg-card px-3 py-2 flex items-end gap-2
```

Textarea overrides (passed via `className`) to neutralize the primitive's own border/shadow/ring, since the wrapper owns those:

```
border-0 shadow-none focus-visible:ring-0
bg-transparent px-2 py-1
min-h-9 max-h-40 resize-none overflow-y-auto
```

Send button: `size="icon"`, no extra classes beyond what variants provide. Variant flips between `default` and `secondary` based on enabled state (see above).

All colors come from existing semantic tokens (`bg-card`, `border`, `bg-primary`, `bg-secondary`, etc.) — no new tokens.

## Showcase

Add a new section to `app/(design-system)/design-system/page.tsx`:

- `id="chat"`, title "Chat"
- Three demos stacked:
  1. Empty state with `placeholder="Type here to exit voice mode..."` — matches mock state 1.
  2. With `defaultValue="Typin"` — matches mock state 2.
  3. With `disabled` — to verify disabled treatment.
- Add a corresponding link in `ShowcaseNav` (`_components/showcase-nav.tsx`).

Each demo wires `onSubmit` to a `console.log` (or `toast`) so the dev can verify behavior in-browser.

## Out of scope (v1)

Explicitly NOT included; add later when a real use case appears:

- Loading/sending state (spinner on the send button, pending submission).
- `maxLength` and character counter.
- Mic button / voice toggle.
- Attachments / file upload.
- Voice-mode awareness (the placeholder text is just a string passed by the consumer; this component does not know what voice mode is).
- IME composition handling (compositionstart/end). Add only if we see real-world bugs with CJK input.
- A compound/slots API (`ChatInput.Root` / `ChatInput.Send`). Will refactor toward that when the first real extension lands.

## Acceptance criteria

- Rendering an empty `<ChatInput onSubmit={fn} />` shows the rounded card with placeholder text and a disabled (secondary) send button.
- Typing any non-whitespace character flips the send button to primary/enabled.
- Pressing Enter on a non-empty input fires `onSubmit(trimmedText)` exactly once and clears the field (uncontrolled).
- Pressing Shift+Enter inserts a newline and does NOT submit.
- Pressing Enter on empty/whitespace-only input does nothing.
- `disabled={true}` blocks both typing and the send button.
- Controlled mode: passing `value` + `onChange` works; internal state is bypassed.
- The component renders correctly in the new design-system "Chat" section across all three demos.
