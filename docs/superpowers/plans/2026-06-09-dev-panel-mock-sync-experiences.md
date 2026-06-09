# Dev Panel: Mock `sync_itinerary_experiences` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-panel control that dispatches the real `sync_itinerary_experiences` command so the "Added" card state + pop/pulse animation can be exercised without the backend.

**Architecture:** A new `SYNC_EXPERIENCES_MOCKS` data array (mirroring the existing `BOOKING_SUMMARY_MOCKS` pattern) feeds a new "itinerary experiences" block in `DevPanel`. Applying a mock calls the existing `applyCommand` reducer directly (via a new `useApplyCommand` hook) — exercising the genuine `false→true` flip that drives the animation. A dev-only `clearAddedExperiencesFromDev` setter lets you reset between runs to re-trigger the animation.

**Tech Stack:** React (`'use client'`), Zustand vanilla store (`uiViewStore`), Vitest, pnpm.

---

## Context for the implementer

- This work is on branch `feat/sync-itinerary-experiences` (already checked out). Do **not** branch off or switch.
- The command schema already exists: `lib/agent-ui/commands.ts:177` (`SyncItineraryExperiences`). Payload shape:
  ```ts
  { type: 'sync_itinerary_experiences',
    payload: { experiences: Array<{ experience_id: string; name: string; day: string; destination: string; passenger_count: number }> },
    correlationId: string }
  ```
  There is **no** `timestamp` field — `Base` is `{ correlationId, sessionId? }`.
- The reducer case already exists: `lib/agent-ui/ui-view-store.ts:148` — it merges into `addedExperiences` (dedup by `experienceId`+`day`, never removes).
- `addedExperiences` flows to `ExperienceCard` via `addedDays`; the card plays the pop/pulse only on the real `false→true` flip. So to re-watch the animation you must clear first.
- Real experience IDs available in `lib/dev/mocks.ts` (`danubeLegends`): Vienna → `signature_vienna_belvedere_palace`; Budapest → `signature_budapest_wenckheim_palace`, `signature_budapest_horse_railway`, `signature_hungary_national_day`.
- To see the effect: dev panel → view `itinerary` → mock `Detail open (Vienna)` → Apply view; then Apply experiences.
- Verify after each task: `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test` must all pass.

---

### Task 1: Add a dev-only setter to clear `addedExperiences`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts` (interface ~line 17–21; initial actions block ~line 187–194)
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/agent-ui/ui-view-store.test.ts`:

```ts
it('clearAddedExperiencesFromDev empties addedExperiences and marks source dev', () => {
  const store = createUiViewStore();
  store.getState().applyCommand({
    type: 'sync_itinerary_experiences',
    payload: {
      experiences: [
        { experience_id: 'signature_vienna_belvedere_palace', name: 'X', day: 'Day 5', destination: '', passenger_count: 2 },
      ],
    },
    correlationId: 'c1',
  });
  expect(store.getState().addedExperiences).toHaveLength(1);

  store.getState().clearAddedExperiencesFromDev();

  expect(store.getState().addedExperiences).toEqual([]);
  expect(store.getState().source).toBe('dev');
});
```

(If `createUiViewStore` is not already imported in the test file, add it to the existing import from `'./ui-view-store'`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- ui-view-store`
Expected: FAIL — `clearAddedExperiencesFromDev is not a function`.

- [ ] **Step 3: Add the setter to the interface**

In `lib/agent-ui/ui-view-store.ts`, in `interface UiViewState`, after `recordParseError: (...) => void;`:

```ts
  clearAddedExperiencesFromDev: () => void;
```

- [ ] **Step 4: Implement the setter**

In the actions object, after the `recordParseError` action (around line 194):

```ts
        clearAddedExperiencesFromDev: () =>
          set(
            { addedExperiences: [], source: 'dev', lastCorrelationId: null },
            false,
            'clearAddedExperiencesFromDev'
          ),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- ui-view-store`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(dev): add clearAddedExperiencesFromDev setter to ui-view-store"
```

---

### Task 2: Expose `applyCommand` and the clear setter via hooks

**Files:**
- Modify: `lib/agent-ui/hooks.ts`

- [ ] **Step 1: Add the hooks**

Append to `lib/agent-ui/hooks.ts`:

```ts
export const useApplyCommand = () => useUiViewStore((s) => s.applyCommand);
export const useClearAddedExperiencesFromDev = () =>
  useUiViewStore((s) => s.clearAddedExperiencesFromDev);
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/hooks.ts
git commit -m "feat(dev): expose applyCommand + clearAddedExperiences hooks"
```

---

### Task 3: Add `SYNC_EXPERIENCES_MOCKS` data

**Files:**
- Modify: `lib/dev/mocks.ts`
- Test: `lib/dev/mocks.test.ts` (create)

- [ ] **Step 1: Add the mock type + data**

In `lib/dev/mocks.ts`, add a `UiCommand` type import to the existing top imports (the file already imports from `@/lib/agent-ui/commands`):

```ts
import type { Cabin, UiCommand } from '@/lib/agent-ui/commands';
```

Then append at the end of the file:

```ts
export interface SyncExperiencesMock {
  id: string;
  label: string;
  command: Extract<UiCommand, { type: 'sync_itinerary_experiences' }>;
}

const syncCommand = (
  id: string,
  experiences: Array<{ experience_id: string; name: string; day: string }>
): SyncExperiencesMock['command'] => ({
  type: 'sync_itinerary_experiences',
  correlationId: `dev-${id}`,
  payload: {
    experiences: experiences.map((e) => ({ ...e, destination: '', passenger_count: 2 })),
  },
});

export const SYNC_EXPERIENCES_MOCKS: readonly SyncExperiencesMock[] = [
  {
    id: 'belvedere',
    label: 'Belvedere · Day 5',
    command: syncCommand('belvedere', [
      {
        experience_id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        day: 'Day 5',
      },
    ]),
  },
  {
    id: 'belvedere_wenckheim',
    label: 'Belvedere · Day 5 + Wenckheim · Day 2',
    command: syncCommand('belvedere_wenckheim', [
      {
        experience_id: 'signature_vienna_belvedere_palace',
        name: 'Signature Vienna: VIP Evening at Belvedere Palace',
        day: 'Day 5',
      },
      {
        experience_id: 'signature_budapest_wenckheim_palace',
        name: 'Signature Budapest: Private Concert at Wenckheim Palace',
        day: 'Day 2',
      },
    ]),
  },
];
```

- [ ] **Step 2: Write a test asserting the mocks satisfy the real schema**

Create `lib/dev/mocks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { UiCommand } from '@/lib/agent-ui/commands';
import { SYNC_EXPERIENCES_MOCKS } from './mocks';

describe('SYNC_EXPERIENCES_MOCKS', () => {
  it('every mock command parses against the UiCommand schema', () => {
    for (const mock of SYNC_EXPERIENCES_MOCKS) {
      expect(() => UiCommand.parse(mock.command)).not.toThrow();
    }
  });

  it('has unique ids', () => {
    const ids = SYNC_EXPERIENCES_MOCKS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm test -- mocks`
Expected: PASS (both cases).

- [ ] **Step 4: Commit**

```bash
git add lib/dev/mocks.ts lib/dev/mocks.test.ts
git commit -m "feat(dev): add SYNC_EXPERIENCES_MOCKS for sync_itinerary_experiences"
```

---

### Task 4: Wire the "itinerary experiences" block into the dev panel

**Files:**
- Modify: `lib/dev/dev-panel.tsx`

- [ ] **Step 1: Import the new pieces**

In `lib/dev/dev-panel.tsx`, extend the hooks import (currently lines 4–10) to add the two new hooks:

```ts
import {
  useApplyCommand,
  useClearAddedExperiencesFromDev,
  useSetBookingSummaryFromDev,
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
```

Extend the mocks import (currently line 15):

```ts
import { BOOKING_SUMMARY_MOCKS, SYNC_EXPERIENCES_MOCKS, VIEW_MOCKS } from './mocks';
```

- [ ] **Step 2: Add state + handlers in the component**

After `const setDevChatMessages = useSetDevChatMessages();` (line 28) add:

```ts
  const applyCommand = useApplyCommand();
  const clearAddedExperiences = useClearAddedExperiencesFromDev();
```

After the `const [chatMockId, setChatMockId] = ...` line (line 35) add:

```ts
  const [syncMockId, setSyncMockId] = useState(SYNC_EXPERIENCES_MOCKS[0]?.id ?? '');
```

After the `applyChat` handler (ends line 61) add:

```ts
  const applyExperiences = () => {
    const chosen =
      SYNC_EXPERIENCES_MOCKS.find((m) => m.id === syncMockId) ?? SYNC_EXPERIENCES_MOCKS[0];
    if (chosen) applyCommand(chosen.command);
  };
```

- [ ] **Step 3: Add the UI block**

In the JSX, immediately after the chat block's `Apply chat` button (the closing `</button>` on line 202, before the `{lastError && (` block), insert:

```tsx
              <div className="mt-2 border-t border-white/20 pt-2">itinerary experiences</div>
              <label className="block">
                mock
                <select
                  className="mt-1 w-full bg-white/10 px-1 py-0.5"
                  value={syncMockId}
                  onChange={(e) => setSyncMockId(e.target.value)}
                >
                  {SYNC_EXPERIENCES_MOCKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyExperiences}
                  className="flex-1 rounded bg-white text-black"
                >
                  Apply experiences
                </button>
                <button
                  type="button"
                  onClick={clearAddedExperiences}
                  className="rounded bg-white/20 px-2 text-white"
                >
                  Clear
                </button>
              </div>
```

- [ ] **Step 4: Verify types + lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors, no warnings introduced by these files.

- [ ] **Step 5: Commit**

```bash
git add lib/dev/dev-panel.tsx
git commit -m "feat(dev): add itinerary-experiences mock block to dev panel"
```

---

### Task 5: Full verification

- [ ] **Step 1: Run the whole suite**

Run: `pnpm test`
Expected: all files pass (prior 152 + the new `mocks.test.ts` cases + the new store test).

- [ ] **Step 2: Lint + types**

Run: `pnpm lint && pnpm tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual smoke (optional, only if user asks for browser verification)**

In the running app: open `dev` panel → view `itinerary` → `Detail open (Vienna)` → Apply view → under "itinerary experiences" pick `Belvedere · Day 5` → Apply experiences → the Belvedere card flips to "Added" with pop/pulse. Click Clear, Apply again to replay.

---

## Out of scope

- Persisting the dev-applied experiences across reload (store is in-memory by design).
- Any production code path — these mocks live only under `lib/dev/` + dev-only setters.
- Reworking the existing view/summary/chat mock blocks.
