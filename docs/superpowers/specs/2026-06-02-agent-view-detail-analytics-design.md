# Agent View Detail Analytics — Design Spec

**Date:** 2026-06-02
**Status:** Draft — pending user review
**Owner:** Alan Bruno

## Goal

Track when a **detail drill-in** opens *within* a view — opening a city detail
(`itinerary`) or a cabin detail (`cabin_selection`). Today `agent_view_shown`
only fires on `view.type` changes, so these intra-view changes are invisible.

The detail can be opened **two ways**, and both must be tracked:

1. **Agent** sends `show_city_detail` / `show_cabin_detail`.
2. **User** clicks a city / cabin card (`setViewFromUser`).

A new `agent_view_detail_shown` event fires on open, labelled with which path
opened it.

## Key insight

Both paths converge on the store: the agent via `applyCommand` (sets
`source: 'agent'`), the click via `setViewFromUser` (sets `source: 'user'`).
Both just mutate `view` (`detailCityId` / `detailCabinId`) + `source`. So a
single observer in `use-view-analytics.ts` — which already reacts to the store
view — covers **both paths in one place**. No handler, reducer, or transport
changes.

The agent path deliberately is **not** fired explicitly: `applyCommand` is a
pure reducer and `dispatchEnvelope` lives in `transport.ts` (the LiveKit seam we
keep isolated). Capturing there would be dirtier than observing the store.

## Scope

In scope:

- New event `agent_view_detail_shown` with payload
  `{ view_type: string; detail_id: string; source: 'agent' | 'user' }`.
- A pure helper `getViewDetailId(view)` in `lib/analytics/view-detail.ts` (the
  only real logic), with co-located tests.
- A second effect in `hooks/use-view-analytics.ts` that fires the event on
  open.
- Doc update: add the event to `conventions/analytics.md` "Current events" and
  note `use-view-analytics` now fires both events.

Out of scope (deferred — next task):

- **Add-on decisions** (`addOnDecisions` confirm/reject). That is an action
  event, not a view-detail open, and is handled separately later.
- Tracking detail **closes** (returning to the list). Only opens fire; a close
  is inferred from the next `agent_view_shown` / detail open.

## Non-goals

- No new top-level view, no command, no transport change.
- No change to the existing `agent_view_shown` event.

## Data model

### Event (`lib/analytics/events.ts`)

```ts
export const ANALYTICS_EVENTS = {
  // ...existing
  agentViewDetailShown: 'agent_view_detail_shown',
} as const;

export type AnalyticsEventProps = {
  // ...existing
  [ANALYTICS_EVENTS.agentViewDetailShown]: {
    view_type: string;
    detail_id: string;          // always present — only opens fire
    source: 'agent' | 'user';   // narrowed: 'dev'/'initial' never reach PostHog
  };
};
```

`source` is typed `'agent' | 'user'` (not the full `UiSource`) because the other
two values can never be captured: `'initial'` is the `start` view (skipped,
`detail_id` null), and `'dev'` only occurs in the dev panel, where analytics is
no-op. The hook guards/narrows to enforce this.

## Logic

### `lib/analytics/view-detail.ts` (new)

```ts
import type { UiView } from '@/lib/agent-ui/ui-view-types';

// The id of the open detail within a view, or null when no detail is open.
export function getViewDetailId(view: UiView): string | null {
  if (view.type === 'itinerary') return view.detailCityId ?? null;
  if (view.type === 'cabin_selection') return view.detailCabinId ?? null;
  return null;
}
```

Extracted to `lib/` per the analytics convention: non-trivial logic in a hook is
pulled out and unit-tested there.

### `hooks/use-view-analytics.ts` (edit)

Add a second effect alongside the existing `agent_view_shown` one:

```ts
const detailId = getViewDetailId(view);

useEffect(() => {
  if (detailId === null) return; // only opens
  const source = uiViewStore.getState().source;
  if (source !== 'agent' && source !== 'user') return; // narrow; dev/initial untracked
  captureEvent(ANALYTICS_EVENTS.agentViewDetailShown, {
    view_type: view.type,
    detail_id: detailId,
    source,
  });
}, [view.type, detailId]);
```

**Why `source` is read imperatively (`getState`) and kept out of the dep array:**
`source` and `detailId` are set in the same store `set()` call, so reading it at
fire time yields the value that accompanied this detail change. Putting `source`
in the deps would let an unrelated command that only changes `source` (e.g.
`set_booking_summary`, which sets `source: 'agent'` without touching the view)
re-fire the event for an already-open detail — a false event. Firing only on
`[view.type, detailId]` avoids that. This mirrors `use-session-analytics`'s
`voiceStore.getState()` read.

### Behavior

| Trigger                                   | Fires                                   |
| ----------------------------------------- | --------------------------------------- |
| Click city/cabin card (`setViewFromUser`) | `detail_id`, `source: 'user'`           |
| Agent `show_city_detail`/`show_cabin_detail` | `detail_id`, `source: 'agent'`       |
| Navigate detail A → B (id changes)        | fires again (a real new open)           |
| Close detail (id → null)                  | no fire (guarded)                       |
| Enter a view at the list level (id null)  | no fire (guarded)                       |

## Tests (vitest, co-located)

- `lib/analytics/view-detail.test.ts` (new):
  - `itinerary` with `detailCityId` → that id; without → `null`.
  - `cabin_selection` with `detailCabinId` → that id; without → `null`.
  - other view types (`start`, `presentation`, `dream_stage`,
    `compare_itinerary`) → `null`.

The hook itself is not unit-tested — per the analytics convention, the hooks are
thin glue verified by running a real session with a key set. The extracted
helper carries the logic and its tests.

## Verification

- `pnpm test` green (new helper tests pass).
- `pnpm lint` clean (no `source` in dep array → no exhaustive-deps warning,
  since `getState()` is read inside the effect).
- Manual: with a PostHog key set, open a city and a cabin detail by click and by
  agent command; confirm one `agent_view_detail_shown` per open with the right
  `detail_id` + `source`.

## Risks / open questions

- **None blocking.** The dev panel (`setViewFromDev`, `source: 'dev'`) could in
  principle open a detail, but analytics is no-op in dev and the guard drops it
  regardless.
