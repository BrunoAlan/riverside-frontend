# Suggestion Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a configurable row of tappable prompt suggestions above the booking summary; tapping one sends its text to the agent as a chat message.

**Architecture:** A pure config module (`lib/suggestions/pills.ts`) holds the catalog and a `pillsForView` selector. A presentational component renders the pills, and a container wires it to `uiViewStore` + `useChatTranscription`. The container is mounted as a sibling above `BookingSummaryContainer` in `app.tsx`. Frontend-only — nothing touches `commands.ts`, the wire protocol, or the backend.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, zustand, Tailwind v4, shadcn/ui, LiveKit components-react, Vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-07-18-suggestion-pills-design.md`

## Global Constraints

- Package manager is `pnpm`. Never invoke `npm` or `yarn`.
- Never edit `components/ui/` by hand — consume the existing shadcn primitives.
- Branch is `feat/suggestion-pills`. Never commit to `main`.
- Vitest runs in `environment: 'node'` — no jsdom, no testing-library. Only pure modules get automated tests. Do NOT add test infrastructure as part of this plan.
- Tests live next to the code they cover (`foo.ts` ↔ `foo.test.ts`).
- Files are formatted with Prettier; run `pnpm format` before committing if formatting drifts.
- Do not add analytics events, per-pill icons, animation, or backend-driven pills. They are explicit non-goals.

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `lib/suggestions/pills.ts` | `SuggestionPill` type, `SUGGESTION_PILLS` catalog, pure `pillsForView` selector. No React. |
| `lib/suggestions/pills.test.ts` | Unit tests for `pillsForView`. |
| `components/agent-ui/suggestion-pills.tsx` | `SuggestionPills` (presentational) + `SuggestionPillsContainer` (store/room wiring). |
| `components/layout/app.tsx` | Mounts `SuggestionPillsContainer` above `BookingSummaryContainer`. |

---

### Task 1: Pill config and `pillsForView` selector

**Files:**
- Create: `lib/suggestions/pills.ts`
- Test: `lib/suggestions/pills.test.ts`

**Interfaces:**
- Consumes: `UiView` from `@/lib/agent-ui/ui-view-types` (existing).
- Produces:
  - `type SuggestionPill = { id: string; label: string; message?: string; views?: UiView['type'][] }`
  - `const SUGGESTION_PILLS: SuggestionPill[]`
  - `function pillsForView(viewType: UiView['type'], pills?: SuggestionPill[]): SuggestionPill[]`

The optional second parameter exists so tests can pass a fixture catalog instead of asserting against the shipped copy, which will change.

- [ ] **Step 1: Write the failing test**

Create `lib/suggestions/pills.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type SuggestionPill, SUGGESTION_PILLS, pillsForView } from './pills';

const FIXTURE: SuggestionPill[] = [
  { id: 'scoped', label: 'Scoped', views: ['dream_stage'] },
  { id: 'global', label: 'Global' },
  { id: 'multi', label: 'Multi', views: ['dream_stage', 'itinerary'] },
];

describe('pillsForView', () => {
  it('includes pills scoped to the view and pills with no views', () => {
    expect(pillsForView('dream_stage', FIXTURE).map((p) => p.id)).toEqual([
      'scoped',
      'global',
      'multi',
    ]);
  });

  it('excludes pills scoped to other views', () => {
    expect(pillsForView('itinerary', FIXTURE).map((p) => p.id)).toEqual(['global', 'multi']);
  });

  it('returns only unscoped pills when no pill targets the view', () => {
    expect(pillsForView('cabin_selection', FIXTURE).map((p) => p.id)).toEqual(['global']);
  });

  it('returns an empty array when the catalog is empty', () => {
    expect(pillsForView('itinerary', [])).toEqual([]);
  });

  it('defaults to the shipped catalog', () => {
    expect(pillsForView('presentation')).toEqual(
      SUGGESTION_PILLS.filter((p) => !p.views || p.views.includes('presentation'))
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/suggestions/pills.test.ts`
Expected: FAIL — `Failed to resolve import "./pills"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/suggestions/pills.ts`:

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type SuggestionPill = {
  /** Stable identifier. Used as the React key. */
  id: string;
  /** Text shown on the pill. */
  label: string;
  /** Text sent to the agent. Defaults to `label`. */
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
  { id: 'river-vs-ocean', label: 'What makes river cruises different from ocean cruises?' },
];

export function pillsForView(
  viewType: UiView['type'],
  pills: SuggestionPill[] = SUGGESTION_PILLS
): SuggestionPill[] {
  return pills.filter((pill) => !pill.views || pill.views.includes(viewType));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/suggestions/pills.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/suggestions/pills.ts lib/suggestions/pills.test.ts
git commit -m "feat(suggestions): add pill catalog and view selector"
```

---

### Task 2: `SuggestionPills` presentational component

**Files:**
- Create: `components/agent-ui/suggestion-pills.tsx`

**Interfaces:**
- Consumes: `SuggestionPill` from `@/lib/suggestions/pills` (Task 1); `Button` from `@/components/ui/button`; `cn` from `@/lib/shadcn/utils`.
- Produces: `export function SuggestionPills({ pills, stacked, onSelect }: SuggestionPillsProps)`.

No test — the repo has no component test infrastructure (see Global Constraints). Verification is the typecheck plus manual check in Task 4.

- [ ] **Step 1: Write the component**

Create `components/agent-ui/suggestion-pills.tsx`:

```tsx
'use client';

import type { SuggestionPill } from '@/lib/suggestions/pills';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

interface SuggestionPillsProps {
  pills: SuggestionPill[];
  /** Stack vertically (no booking summary) instead of a single row. */
  stacked: boolean;
  onSelect: (pill: SuggestionPill) => void;
}

export function SuggestionPills({ pills, stacked, onSelect }: SuggestionPillsProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex gap-2',
        stacked ? 'flex-col items-center' : 'flex-wrap justify-center'
      )}
    >
      {pills.map((pill) => (
        <Button
          key={pill.id}
          variant="secondary"
          size="sm"
          className="bg-card/95 border-beige-300 h-auto rounded-full border px-4 py-2 text-sm whitespace-normal backdrop-blur"
          onClick={() => onSelect(pill)}
        >
          {pill.label}
        </Button>
      ))}
    </div>
  );
}
```

Notes for the implementer:
- `whitespace-normal` and `h-auto` override the `Button` base `whitespace-nowrap` / fixed height so long labels wrap rather than overflow on narrow screens.
- The `bg-card/95` + `border-beige-300` + `backdrop-blur` trio matches the booking summary card, so the pills read as the same surface.

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm lint`
Expected: PASS, no errors for `components/agent-ui/suggestion-pills.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/suggestion-pills.tsx
git commit -m "feat(suggestions): add SuggestionPills component"
```

---

### Task 3: `SuggestionPillsContainer` wiring

**Files:**
- Modify: `components/agent-ui/suggestion-pills.tsx` (append the container)

**Interfaces:**
- Consumes: `SuggestionPills` (Task 2); `pillsForView` (Task 1); `useUiView`, `useBookingSummary` from `@/lib/agent-ui/hooks`; `useChatTranscription` from `@/hooks/use-chat-transcription`; `useMaybeRoomContext` from `@livekit/components-react`.
- Produces: `export function SuggestionPillsContainer()`.

- [ ] **Step 1: Add the container**

Append to `components/agent-ui/suggestion-pills.tsx`, and extend the existing imports at the top of the file to include the new ones:

```tsx
export function SuggestionPillsContainer() {
  const view = useUiView();
  const summary = useBookingSummary();
  const room = useMaybeRoomContext();
  const { sendMessage } = useChatTranscription();
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  const pills = pillsForView(view.type);

  // `sendMessage` silently no-ops without a connected local participant, so a
  // pill tapped before the room connects would do nothing. Hide until it does.
  if (!room?.localParticipant) return null;
  if (pills.length === 0) return null;
  if (dismissedAt === view.type) return null;

  return (
    <div className="pointer-events-none flex justify-center px-18 pb-4">
      <SuggestionPills
        pills={pills}
        stacked={summary === null}
        onSelect={(pill) => {
          setDismissedAt(view.type);
          void sendMessage(pill.message ?? pill.label);
        }}
      />
    </div>
  );
}
```

The full import block for the file after this step:

```tsx
'use client';

import { useState } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { useChatTranscription } from '@/hooks/use-chat-transcription';
import { useBookingSummary, useUiView } from '@/lib/agent-ui/hooks';
import { type SuggestionPill, pillsForView } from '@/lib/suggestions/pills';
import { cn } from '@/lib/shadcn/utils';
```

Notes for the implementer:
- `dismissedAt` stores the `view.type` at which the row was dismissed. When the view changes it stops matching and the row reappears with that view's pills. Nothing is persisted and nothing is added to `uiViewStore`.
- The hooks must all be called before the early `return null`s — React requires unconditional hook calls.

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm lint`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/suggestion-pills.tsx
git commit -m "feat(suggestions): wire pills to view store and chat transport"
```

---

### Task 4: Mount in the app layout

**Files:**
- Modify: `components/layout/app.tsx` (import block, and the JSX tree around line 69)

**Interfaces:**
- Consumes: `SuggestionPillsContainer` (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the import**

In `components/layout/app.tsx`, add alongside the existing `@/components/agent-ui/...` import:

```tsx
import { SuggestionPillsContainer } from '@/components/agent-ui/suggestion-pills';
```

- [ ] **Step 2: Mount the container**

Change:

```tsx
          <ViewController />
        </div>
        <BookingSummaryContainer />
        <ChatDockContainer />
```

to:

```tsx
          <ViewController />
        </div>
        <SuggestionPillsContainer />
        <BookingSummaryContainer />
        <ChatDockContainer />
```

- [ ] **Step 3: Run lint and the full test suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS. `pnpm test` includes the Task 1 tests plus the pre-existing suite.

- [ ] **Step 4: Manual verification**

Run: `pnpm dev`, open the app, start a session.

Check each of these:
1. Before the room connects, no pills are visible.
2. Once connected on the `presentation` view, the pills render **stacked and centered** above the chat dock (no booking summary yet).
3. Tapping a pill sends the message — it appears in the chat transcript as a user message and the agent responds.
4. After tapping, the whole pill row disappears.
5. When the agent moves the app to a view with a booking summary, the pills reappear as a **single centered row** directly above the summary card, with no overlap.
6. `Tell me about Budapest` (no `views` field) appears on every view; `Plan a romantic Christmas getaway in Vienna` appears only on `presentation` and `dream_stage`.

Do not proceed to commit until all six hold.

- [ ] **Step 5: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(suggestions): mount suggestion pills in app layout"
```
