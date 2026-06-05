# Event Debug Panel (dev) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a development-only panel tab that logs the structured LiveKit events between the agent (`ui-commands`) and the frontend (`frontend-intent`), with expandable JSON payloads and raw envelopes.

**Architecture:** A dev-only zustand ring-buffer store collects events. A single always-safe `recordDevEvent(...)` wrapper (no-op in production, mirroring the analytics wrapper) is called from the two existing seams — `dispatchEnvelope` in `transport.ts` and `publishFrontendIntent` in `frontend-intent.ts`. The existing `DevPanel` gains a "Mocks"/"Events" tab pair; the Events tab renders the log. Production code imports only `recordDevEvent`.

**Tech Stack:** TypeScript, React, zustand (vanilla `createStore` + `useStore`), Vitest, Tailwind.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/dev/event-log-store.ts` (new) | Vanilla zustand singleton: `DevEvent` type, ring buffer (cap 200), `record`/`clear`, `useDevEventLog`/`useClearDevEventLog` hooks. |
| `lib/dev/record-dev-event.ts` (new) | `recordDevEvent(...)` — always-safe wrapper, no-ops in production. Only module prod code imports. |
| `lib/agent-ui/transport.ts` (modify) | In `dispatchEnvelope`, record each applied command and each parse error. |
| `lib/agent-ui/frontend-intent.ts` (modify) | In `publishFrontendIntent`, record the outbound intent. |
| `lib/dev/event-log-list.tsx` (new) | The Events log UI: rows + expandable JSON + Clear. |
| `lib/dev/dev-panel.tsx` (modify) | Add Mocks/Events tabs; Events tab renders `EventLogList`. |

Test files live next to code: `event-log-store.test.ts`, `record-dev-event.test.ts`, and additions to `transport.test.ts`.

---

## Task 1: Event log store

**Files:**
- Create: `lib/dev/event-log-store.ts`
- Test: `lib/dev/event-log-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/dev/event-log-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createEventLogStore } from './event-log-store';

describe('event-log-store', () => {
  it('appends events and assigns incrementing seq and id', () => {
    const store = createEventLogStore();
    store.getState().record({ ts: 1, channel: 'ui-commands', label: 'a', ok: true, payload: {} });
    store.getState().record({ ts: 2, channel: 'frontend-intent', label: 'b', ok: true, payload: {} });
    const { events } = store.getState();
    expect(events.map((e) => e.seq)).toEqual([0, 1]);
    expect(events.map((e) => e.id)).toEqual(['0', '1']);
    expect(events.map((e) => e.label)).toEqual(['a', 'b']);
  });

  it('keeps seq monotonic across the cap and drops the oldest', () => {
    const store = createEventLogStore();
    for (let i = 0; i < 205; i++) {
      store.getState().record({ ts: i, channel: 'ui-commands', label: `e${i}`, ok: true, payload: {} });
    }
    const { events } = store.getState();
    expect(events).toHaveLength(200);
    expect(events[0].label).toBe('e5'); // first 5 dropped
    expect(events[events.length - 1].seq).toBe(204);
  });

  it('clear empties the events but keeps seq monotonic', () => {
    const store = createEventLogStore();
    store.getState().record({ ts: 1, channel: 'ui-commands', label: 'a', ok: true, payload: {} });
    store.getState().clear();
    expect(store.getState().events).toEqual([]);
    store.getState().record({ ts: 2, channel: 'ui-commands', label: 'b', ok: true, payload: {} });
    expect(store.getState().events[0].seq).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/dev/event-log-store.test.ts`
Expected: FAIL — `createEventLogStore` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/dev/event-log-store.ts`:

```ts
'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type DevEvent = {
  id: string;
  seq: number;
  ts: number;
  channel: 'ui-commands' | 'frontend-intent';
  label: string;
  correlationId?: string;
  ok: boolean;
  payload: unknown;
  envelope?: unknown;
};

export type DevEventInput = Omit<DevEvent, 'id' | 'seq'>;

const CAP = 200;

interface EventLogState {
  events: DevEvent[];
  nextSeq: number;
  record: (input: DevEventInput) => void;
  clear: () => void;
}

export function createEventLogStore() {
  return createStore<EventLogState>()((set) => ({
    events: [],
    nextSeq: 0,
    record: (input) =>
      set((s) => {
        const seq = s.nextSeq;
        const event: DevEvent = { ...input, seq, id: String(seq) };
        const next = [...s.events, event];
        return {
          events: next.length > CAP ? next.slice(next.length - CAP) : next,
          nextSeq: seq + 1,
        };
      }),
    clear: () => set({ events: [] }),
  }));
}

// Singleton used by the running app.
export const eventLogStore = createEventLogStore();

function useEventLogStore<T>(selector: (s: EventLogState) => T): T {
  return useStore(eventLogStore, selector);
}

export const useDevEventLog = () => useEventLogStore((s) => s.events);
export const useClearDevEventLog = () => useEventLogStore((s) => s.clear);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/dev/event-log-store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dev/event-log-store.ts lib/dev/event-log-store.test.ts
git commit -m "feat(dev): event log ring-buffer store"
```

---

## Task 2: recordDevEvent wrapper

**Files:**
- Create: `lib/dev/record-dev-event.ts`
- Test: `lib/dev/record-dev-event.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/dev/record-dev-event.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventLogStore } from './event-log-store';
import { recordDevEvent } from './record-dev-event';

afterEach(() => {
  vi.unstubAllEnvs();
  eventLogStore.getState().clear();
});

describe('recordDevEvent', () => {
  it('records an event with a stamped ts in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    recordDevEvent({ channel: 'frontend-intent', label: 'view_itinerary', ok: true, payload: { a: 1 } });
    const { events } = eventLogStore.getState();
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('view_itinerary');
    expect(typeof events[0].ts).toBe('number');
  });

  it('no-ops in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    recordDevEvent({ channel: 'ui-commands', label: 'x', ok: true, payload: {} });
    expect(eventLogStore.getState().events).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/dev/record-dev-event.test.ts`
Expected: FAIL — `recordDevEvent` not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/dev/record-dev-event.ts`:

```ts
import { eventLogStore, type DevEventInput } from './event-log-store';

// Always safe to call. No-ops in production so prod code never reaches the
// dev store — mirrors the analytics `captureEvent` wrapper.
export function recordDevEvent(input: Omit<DevEventInput, 'ts'>): void {
  if (process.env.NODE_ENV === 'production') return;
  eventLogStore.getState().record({ ...input, ts: Date.now() });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/dev/record-dev-event.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dev/record-dev-event.ts lib/dev/record-dev-event.test.ts
git commit -m "feat(dev): always-safe recordDevEvent wrapper"
```

---

## Task 3: Instrument the ui-commands seam

**Files:**
- Modify: `lib/agent-ui/transport.ts` (inside `dispatchEnvelope`)
- Test: `lib/agent-ui/transport.test.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Add to `lib/agent-ui/transport.test.ts`. First add the imports at the top (next to the existing imports):

```ts
import { beforeEach } from 'vitest';
import { eventLogStore } from '../dev/event-log-store';
```

Then add a new `describe` block at the end of the file:

```ts
describe('dispatchEnvelope dev event logging', () => {
  beforeEach(() => {
    eventLogStore.getState().clear();
  });

  it('records an applied command with the parsed payload and raw envelope', () => {
    const store = createUiViewStore();
    const envelope = { correlationId: 'env-1', sessionId: 'sess-1', commands: [validDestinationDetail] };
    dispatchEnvelope(envelope, store.getState());
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'ui-commands',
      label: 'show_destination_detail',
      correlationId: 'cmd-1',
      ok: true,
    });
    expect(events[0].envelope).toBe(envelope);
  });

  it('records a parse error event with ok:false', () => {
    const store = createUiViewStore();
    dispatchEnvelope(
      { correlationId: 'env-2', commands: [{ type: 'nope', correlationId: 'cmd-2', payload: {} }] },
      store.getState()
    );
    const events = eventLogStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ channel: 'ui-commands', label: 'parse-error', ok: false, correlationId: 'cmd-2' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/agent-ui/transport.test.ts`
Expected: FAIL — the new "dev event logging" tests fail (0 events recorded). Existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

In `lib/agent-ui/transport.ts`, add the import after the existing `uiViewStore` import:

```ts
import { recordDevEvent } from '../dev/record-dev-event';
```

In `dispatchEnvelope`, in the `if (result.success)` branch, after the existing `console.log('[ui-commands] applied', ...)` call, add:

```ts
      recordDevEvent({
        channel: 'ui-commands',
        label: result.data.type,
        correlationId: result.data.correlationId,
        ok: true,
        payload: result.data,
        envelope,
      });
```

In the `else` branch, after the existing `console.warn('[ui-commands] parse error', ...)` call, add:

```ts
      recordDevEvent({
        channel: 'ui-commands',
        label: 'parse-error',
        correlationId,
        ok: false,
        payload: raw,
        envelope,
      });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/agent-ui/transport.test.ts`
Expected: PASS (all existing tests + 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/transport.ts lib/agent-ui/transport.test.ts
git commit -m "feat(dev): record ui-commands events from transport seam"
```

---

## Task 4: Instrument the frontend-intent seam

**Files:**
- Modify: `lib/agent-ui/frontend-intent.ts` (inside `publishFrontendIntent`)

No new test: `publishFrontendIntent` is thin glue over LiveKit `publishData` (same reason the analytics hooks aren't unit-tested). The wrapper itself is covered by Task 2. Verified by running a session.

- [ ] **Step 1: Add the import**

In `lib/agent-ui/frontend-intent.ts`, add at the top with the other imports:

```ts
import { recordDevEvent } from '@/lib/dev/record-dev-event';
```

- [ ] **Step 2: Record after publishing**

In `publishFrontendIntent`, after the existing `console.log('[frontend-intent] sent', ...)` call, add:

```ts
  recordDevEvent({
    channel: 'frontend-intent',
    label: envelope.intent,
    correlationId: envelope.correlationId,
    ok: true,
    payload: envelope,
  });
```

- [ ] **Step 3: Verify the suite still passes**

Run: `pnpm test`
Expected: PASS (full suite green, including existing `frontend-intent.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add lib/agent-ui/frontend-intent.ts
git commit -m "feat(dev): record frontend-intent events from publish seam"
```

---

## Task 5: Event log list UI

**Files:**
- Create: `lib/dev/event-log-list.tsx`

No unit test (repo rule: thin React glue is verified by running it).

- [ ] **Step 1: Create the component**

Create `lib/dev/event-log-list.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { type DevEvent, useClearDevEventLog, useDevEventLog } from './event-log-store';

const CHANNEL_COLOR: Record<DevEvent['channel'], string> = {
  'ui-commands': 'text-sky-300',
  'frontend-intent': 'text-amber-300',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function EventRow({ event }: { event: DevEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="opacity-60">{formatTime(event.ts)}</span>
        <span className={CHANNEL_COLOR[event.channel]}>{event.channel}</span>
        <span className={event.ok ? '' : 'text-red-400'}>{event.label}</span>
        {event.correlationId && (
          <span className="ml-auto opacity-50">{event.correlationId.slice(0, 8)}</span>
        )}
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          <div className="opacity-60">payload</div>
          <pre className="max-h-48 overflow-auto rounded bg-white/5 p-1">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
          {event.envelope !== undefined && (
            <>
              <div className="opacity-60">envelope</div>
              <pre className="max-h-48 overflow-auto rounded bg-white/5 p-1">
                {JSON.stringify(event.envelope, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EventLogList() {
  const events = useDevEventLog();
  const clear = useClearDevEventLog();
  const newestFirst = [...events].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="opacity-60">{events.length} events</span>
        <button type="button" onClick={clear} className="rounded bg-white/20 px-2 py-0.5">
          Clear
        </button>
      </div>
      <div className="max-h-80 overflow-auto">
        {newestFirst.length === 0 && <div className="opacity-50">no events yet</div>}
        {newestFirst.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: PASS (no errors in `event-log-list.tsx`).

- [ ] **Step 3: Commit**

```bash
git add lib/dev/event-log-list.tsx
git commit -m "feat(dev): event log list UI"
```

---

## Task 6: Add Mocks/Events tabs to DevPanel

**Files:**
- Modify: `lib/dev/dev-panel.tsx`

No unit test (repo rule: thin React glue).

- [ ] **Step 1: Add imports and tab state**

In `lib/dev/dev-panel.tsx`, add to the imports:

```tsx
import { EventLogList } from './event-log-list';
```

Inside the `DevPanel` component, add a tab state next to the existing `open` state:

```tsx
  const [tab, setTab] = useState<'mocks' | 'events'>('mocks');
```

- [ ] **Step 2: Render the tab header and switch content**

In the open-panel JSX, replace the existing header block:

```tsx
          <div className="flex items-center justify-between">
            <span>UI dev panel</span>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
```

with a header that includes the tab toggle:

```tsx
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('mocks')}
                className={tab === 'mocks' ? 'underline' : 'opacity-60'}
              >
                Mocks
              </button>
              <button
                type="button"
                onClick={() => setTab('events')}
                className={tab === 'events' ? 'underline' : 'opacity-60'}
              >
                Events
              </button>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
```

Then wrap the existing Mocks content (everything from the `current: ...` div down to and including the `lastError` block) so it only renders on the Mocks tab, and render `EventLogList` on the Events tab. Concretely, immediately after the header block above, open a conditional:

```tsx
          {tab === 'events' ? (
            <EventLogList />
          ) : (
            <>
```

and immediately before the closing `</div>` of the `w-72 ...` panel container (after the `lastError` block), close it:

```tsx
            </>
          )}
```

- [ ] **Step 3: Widen the panel for the log (optional but recommended)**

In the panel container className, change `w-72` to `w-80` so the JSON is readable:

```tsx
        <div className="w-80 space-y-2 rounded-md bg-black/80 p-3 text-white">
```

- [ ] **Step 4: Verify lint and the full suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dev/dev-panel.tsx
git commit -m "feat(dev): Mocks/Events tabs in DevPanel"
```

---

## Task 7: Manual verification

**Files:** none.

- [ ] **Step 1: Run the app**

Run: `pnpm dev`

- [ ] **Step 2: Verify the Events tab**

1. Open the app, click the `dev` button (bottom-right), switch to the **Events** tab.
2. Start a session and interact (open the map, view a city, select a cabin) → confirm `frontend-intent` rows appear (amber) with the intent label.
3. As the agent drives the UI → confirm `ui-commands` rows appear (sky). Expand one and confirm both **payload** (parsed command) and **envelope** (raw, with `sessionId`/`timestamp`) show.
4. Trigger/await a malformed command if possible → confirm a red `parse-error` row.
5. Click **Clear** → list empties.

- [ ] **Step 3: Final full check before any push**

Run: `pnpm lint && pnpm test`
Expected: both PASS. (Per AGENTS.md, never push without a clean lint + test.)

---

## Self-Review Notes

- **Spec coverage:** event shape (Task 1), no-op-in-prod wrapper (Task 2), both seams instrumented with envelope capture (Tasks 3–4), tabs + expandable JSON UI (Tasks 5–6), store/wrapper tests (Tasks 1–2), manual verification of React glue (Task 7). Direction field intentionally omitted per design.
- **Type consistency:** `DevEvent` / `DevEventInput` defined in Task 1 are reused verbatim in Tasks 2–6; `recordDevEvent` input is `Omit<DevEventInput, 'ts'>` everywhere; `channel` values `'ui-commands'`/`'frontend-intent'` consistent across store, seams, and UI.
- **No persistence / no export / no chat / no PostHog** — explicit non-goals from the spec.
