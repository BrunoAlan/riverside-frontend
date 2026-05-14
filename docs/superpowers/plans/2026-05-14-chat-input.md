# ChatInput Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `ChatInput` component (rounded card with multiline textarea + send button, primary when text present, secondary when empty) composed from existing `Textarea` and `Button` primitives, and showcase it in the design-system page.

**Architecture:** Single client component `ChatInput` in a new `components/chat/` folder. Hybrid controlled/uncontrolled state via Radix's `useControllableState` (already a transitive dep). Enter submits, Shift+Enter newlines, submit trims and no-ops on empty. Visual proof in `/design-system` page.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn-style primitives (`components/ui/*`), `lucide-react` icons, `@radix-ui/react-use-controllable-state`. No unit-test framework in this repo — verification is browser-based via the design-system page.

**Spec:** `docs/superpowers/specs/2026-05-14-chat-input-design.md`

---

## Task 1: Create ChatInput component

**Files:**
- Create: `components/chat/chat-input.tsx`

- [ ] **Step 1: Create the component file**

Create `components/chat/chat-input.tsx` with the full implementation below.

```tsx
'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/shadcn/utils';

export type ChatInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
};

function ChatInput({
  value: valueProp,
  defaultValue,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  className,
  autoFocus,
}: ChatInputProps) {
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? '',
    onChange,
  });

  const text = value ?? '';
  const canSubmit = !disabled && text.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      data-slot="chat-input"
      className={cn(
        'bg-card flex items-end gap-2 rounded-2xl border px-3 py-2',
        className
      )}
    >
      <Textarea
        value={text}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        className="max-h-40 min-h-9 resize-none overflow-y-auto border-0 bg-transparent px-2 py-1 shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        size="icon"
        variant={canSubmit ? 'default' : 'secondary'}
        disabled={!canSubmit}
        onClick={submit}
        aria-label="Send message"
      >
        <Send />
      </Button>
    </div>
  );
}

export { ChatInput };
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: no errors related to the new file.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat-input.tsx
git commit -m "feat(chat): add ChatInput composer component"
```

---

## Task 2: Add "Chat" section to design-system page

**Files:**
- Modify: `app/(design-system)/design-system/_components/showcase-nav.tsx`
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Add nav entry**

In `app/(design-system)/design-system/_components/showcase-nav.tsx`, append `{ id: 'chat', label: 'Chat' }` to the `SECTIONS` array (after `misc`):

```tsx
const SECTIONS = [
  { id: 'colors', label: 'Colors' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'misc', label: 'Misc' },
  { id: 'chat', label: 'Chat' },
];
```

- [ ] **Step 2: Import ChatInput and toast in the page**

In `app/(design-system)/design-system/page.tsx`, add the import alongside the other component imports (group with the local `components/` imports, keep alphabetical roughly):

```tsx
import { ChatInput } from '@/components/chat/chat-input';
```

(`toast` from `sonner` is already imported.)

- [ ] **Step 3: Add the Chat section before the closing `</main>`**

In `app/(design-system)/design-system/page.tsx`, immediately after the existing `<Section id="misc" ...>...</Section>` block and before `</main>`, insert:

```tsx
<Section id="chat" title="Chat" description="Composer for chat surfaces.">
  <div className="max-w-2xl space-y-6">
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Empty (placeholder)</h3>
      <ChatInput
        placeholder="Type here to exit voice mode..."
        onSubmit={(text) => toast(`Sent: ${text}`)}
      />
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">With text</h3>
      <ChatInput
        defaultValue="Typin"
        onSubmit={(text) => toast(`Sent: ${text}`)}
      />
    </div>
    <div>
      <h3 className="text-foreground mb-3 text-sm font-medium">Disabled</h3>
      <ChatInput
        placeholder="Disabled while the agent is responding..."
        disabled
        onSubmit={(text) => toast(`Sent: ${text}`)}
      />
    </div>
  </div>
</Section>
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify lint passes**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(design-system\)/design-system/_components/showcase-nav.tsx app/\(design-system\)/design-system/page.tsx
git commit -m "docs(design-system): showcase ChatInput in Chat section"
```

---

## Task 3: Browser verification

**Files:** none (manual verification)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Open the design-system page**

Navigate to `http://localhost:3000/design-system` and scroll to the "Chat" section (or click the nav link).

- [ ] **Step 3: Verify the three demos render correctly**

For each demo, confirm:

1. **Empty (placeholder):** Rounded card visible with placeholder text "Type here to exit voice mode..."; send button is grey/secondary and disabled (no pointer cursor, dimmed).
2. **With text:** Default value "Typin" visible in the textarea; send button is dark green/primary and enabled.
3. **Disabled:** Both textarea and send button are disabled; placeholder shows the disabled-state copy.

- [ ] **Step 4: Verify behavior in demo 2 (or after typing in demo 1)**

- Type a character → send button flips from secondary (grey) to primary (green).
- Delete all characters → button flips back to secondary and disabled.
- Type "hello", press Enter → toast appears with "Sent: hello", textarea clears.
- Type "line one", press Shift+Enter, type "line two" → newline inserted, textarea grows to ~2 lines, no submit fires.
- Press Enter on empty (whitespace-only) textarea → nothing happens.
- Type ~10 lines (Shift+Enter repeatedly) → textarea stops growing at `max-h-40` and shows internal scroll.

- [ ] **Step 5: Stop the dev server**

Ctrl+C in the dev server terminal.

- [ ] **Step 6: Final commit (only if changes were needed during verification)**

If verification surfaced issues, fix them, then commit. Otherwise this task has no commit.
