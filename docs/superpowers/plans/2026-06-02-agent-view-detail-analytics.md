# Agent View Detail Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fire a new `agent_view_detail_shown` PostHog event whenever a city or cabin detail opens within a view — covering both agent-driven and click-driven opens — labelled with the source.

**Architecture:** Both opens converge on the `uiViewStore` (`detailCityId` / `detailCabinId` + `source`). A single new effect in `use-view-analytics.ts` observes the store and fires the event, so no handler/reducer/transport changes are needed. The view→detail-id mapping is extracted to a pure, unit-tested helper.

**Tech Stack:** TypeScript, React (hooks/effects), Zustand (`uiViewStore`), PostHog wrapper (`lib/analytics`), Vitest.

---

## File Structure

- **Create** `lib/analytics/view-detail.ts` — pure `getViewDetailId(view)` helper (only real logic).
- **Create** `lib/analytics/view-detail.test.ts` — co-located unit tests for the helper.
- **Modify** `lib/analytics/events.ts` — declare the `agentViewDetailShown` event + payload type.
- **Modify** `hooks/use-view-analytics.ts` — add the detail-open effect.
- **Modify** `conventions/analytics.md` — document the new event.

---

### Task 1: Pure `getViewDetailId` helper (TDD)

**Files:**
- Create: `lib/analytics/view-detail.ts`
- Test: `lib/analytics/view-detail.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/analytics/view-detail.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { getViewDetailId } from './view-detail';

describe('getViewDetailId', () => {
  it('returns the city id when an itinerary detail is open', () => {
    const view: UiView = { type: 'itinerary', addOnDecisions: {}, detailCityId: 'vienna' };
    expect(getViewDetailId(view)).toBe('vienna');
  });

  it('returns null for an itinerary with no detail open', () => {
    const view: UiView = { type: 'itinerary', addOnDecisions: {} };
    expect(getViewDetailId(view)).toBeNull();
  });

  it('returns the cabin id when a cabin detail is open', () => {
    const view: UiView = { type: 'cabin_selection', cabins: [], detailCabinId: 'owners-suite' };
    expect(getViewDetailId(view)).toBe('owners-suite');
  });

  it('returns null for a cabin selection with no detail open', () => {
    const view: UiView = { type: 'cabin_selection', cabins: [] };
    expect(getViewDetailId(view)).toBeNull();
  });

  it('returns null for views without a detail concept', () => {
    expect(getViewDetailId({ type: 'start' })).toBeNull();
    expect(getViewDetailId({ type: 'presentation' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test view-detail`
Expected: FAIL — cannot resolve `./view-detail` (module not found).

- [ ] **Step 3: Write the minimal implementation**

Create `lib/analytics/view-detail.ts`:

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

// The id of the open detail within a view, or null when no detail is open.
// Both itinerary city detail and cabin detail live as sub-state of their view.
export function getViewDetailId(view: UiView): string | null {
  if (view.type === 'itinerary') return view.detailCityId ?? null;
  if (view.type === 'cabin_selection') return view.detailCabinId ?? null;
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test view-detail`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/view-detail.ts lib/analytics/view-detail.test.ts
git commit -m "feat(analytics): add getViewDetailId helper"
```

---

### Task 2: Declare the `agent_view_detail_shown` event

**Files:**
- Modify: `lib/analytics/events.ts`

- [ ] **Step 1: Add the event name**

In `lib/analytics/events.ts`, add to the `ANALYTICS_EVENTS` object (after `agentViewShown`):

```ts
export const ANALYTICS_EVENTS = {
  testerIdentified: 'tester_identified',
  sessionStarted: 'session_started',
  sessionEnded: 'session_ended',
  agentError: 'agent_error',
  agentViewShown: 'agent_view_shown',
  agentViewDetailShown: 'agent_view_detail_shown',
} as const;
```

- [ ] **Step 2: Add the payload type**

In the same file, add to `AnalyticsEventProps` (after the `agentViewShown` entry):

```ts
  [ANALYTICS_EVENTS.agentViewShown]: { view_type: string };
  [ANALYTICS_EVENTS.agentViewDetailShown]: {
    view_type: string;
    detail_id: string;
    source: 'agent' | 'user';
  };
```

- [ ] **Step 3: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS — no new errors (the file is still internally consistent; the new event has no call site yet).

- [ ] **Step 4: Commit**

```bash
git add lib/analytics/events.ts
git commit -m "feat(analytics): declare agent_view_detail_shown event"
```

---

### Task 3: Fire the event from `use-view-analytics`

**Files:**
- Modify: `hooks/use-view-analytics.ts`

- [ ] **Step 1: Replace the hook body**

Replace the entire contents of `hooks/use-view-analytics.ts` with:

```ts
import { useEffect } from 'react';
import { useUiView } from '@/lib/agent-ui/hooks';
import { uiViewStore } from '@/lib/agent-ui/ui-view-store';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { captureEvent } from '@/lib/analytics/posthog';
import { getViewDetailId } from '@/lib/analytics/view-detail';

export function useViewAnalytics() {
  const view = useUiView();

  useEffect(() => {
    if (view.type === 'start') return;
    captureEvent(ANALYTICS_EVENTS.agentViewShown, { view_type: view.type });
  }, [view.type]);

  // Fire when a detail drill-in opens within a view (city / cabin). Both the
  // agent (applyCommand) and a user click (setViewFromUser) only mutate the
  // store, so observing it here covers both paths in one place.
  const detailId = getViewDetailId(view);

  useEffect(() => {
    if (detailId === null) return; // only opens; closing (id -> null) is silent
    // Read source imperatively: it is set in the same store update as detailId,
    // and keeping it out of the dep array avoids re-firing when an unrelated
    // command (e.g. set_booking_summary) changes only `source`.
    const source = uiViewStore.getState().source;
    if (source !== 'agent' && source !== 'user') return; // dev/initial never tracked
    captureEvent(ANALYTICS_EVENTS.agentViewDetailShown, {
      view_type: view.type,
      detail_id: detailId,
      source,
    });
  }, [view.type, detailId]);
}
```

- [ ] **Step 2: Verify lint passes (no exhaustive-deps warning)**

Run: `pnpm lint`
Expected: PASS — no `react-hooks/exhaustive-deps` warning. `source` is read via `getState()` inside the effect, not from the closure, so it is correctly absent from the dep array; `view.type` and `detailId` are the only reactive reads.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all tests green (no behavioral test for the hook per convention; this confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add hooks/use-view-analytics.ts
git commit -m "feat(analytics): fire agent_view_detail_shown on detail open"
```

---

### Task 4: Document the event in conventions

**Files:**
- Modify: `conventions/analytics.md`

- [ ] **Step 1: Update the `use-view-analytics` responsibility row**

In `conventions/analytics.md`, in the "Files" table, replace the `use-view-analytics.ts` row:

```md
| [`hooks/use-view-analytics.ts`](../hooks/use-view-analytics.ts)                             | `agent_view_shown` on view change; `agent_view_detail_shown` on detail open. |
```

- [ ] **Step 2: Add the event to the "Current events" table**

In the same file, add a row to the "Current events" table after the `agent_view_shown` row:

```md
| `agent_view_shown`        | `use-view-analytics`    | `{ view_type: string }`                          |
| `agent_view_detail_shown` | `use-view-analytics`    | `{ view_type, detail_id, source: 'agent'\|'user' }` |
```

- [ ] **Step 3: Verify formatting**

Run: `pnpm format:check conventions/analytics.md`
Expected: PASS (or run `pnpm format` to fix table alignment, then re-check).

- [ ] **Step 4: Commit**

```bash
git add conventions/analytics.md
git commit -m "docs(analytics): document agent_view_detail_shown event"
```

---

## Final Verification

- [ ] Run `pnpm test` → all green.
- [ ] Run `pnpm lint` → clean.
- [ ] Confirm the four commits exist on `feat/user-testing-analytics`.

## Self-Review Notes

- **Spec coverage:** event declaration (Task 2), helper + tests (Task 1), hook effect with source-narrowing and getState read (Task 3), docs (Task 4) — all spec sections covered. Add-ons and detail-close are explicitly out of scope and have no task, as intended.
- **Type consistency:** `getViewDetailId` signature matches between Task 1 (definition) and Task 3 (call). Payload keys `view_type` / `detail_id` / `source` match between Task 2 (type) and Task 3 (call). `source: 'agent' | 'user'` consistent across spec, Task 2, Task 3.
- **No placeholders:** every code/command step is concrete.
