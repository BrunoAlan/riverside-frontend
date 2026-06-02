# Analytics

We use [PostHog](https://posthog.com) to instrument user-testing sessions: who the
tester is, when a voice session starts/ends, what views the agent shows, and when
the agent fails. This doc explains how events flow, how to add a new one, and the
rules that keep the data clean.

## The big picture

```
app/agent/page.tsx
  └─ <PostHogProvider>        inits PostHog once on mount
       └─ <IdentityGate>      blocks until the tester declares name + email
            └─ <App>          AppSetup() mounts the analytics hooks
```

Everything funnels through one thin wrapper, [`lib/analytics/posthog.ts`](../lib/analytics/posthog.ts).
No component or hook ever imports `posthog-js` directly — they call `captureEvent`,
`identifyTester`, and `initPostHog` from the wrapper. This is the analytics equivalent
of the "talk to `uiViewStore`, not LiveKit" rule: one seam, easy to no-op, easy to test.

### Files

| File                                                                                        | Responsibility                                                               |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`lib/analytics/events.ts`](../lib/analytics/events.ts)                                     | **Source of truth** — event names + their payload types. Start here.         |
| [`lib/analytics/posthog.ts`](../lib/analytics/posthog.ts)                                   | The only module that touches `posthog-js`. `init` / `identify` / `capture`.  |
| [`lib/analytics/identity.ts`](../lib/analytics/identity.ts)                                 | Read/write the tester's `{ name, email }` to `localStorage`.                 |
| [`lib/analytics/duration.ts`](../lib/analytics/duration.ts)                                 | Pure `computeDurationSeconds(start, end)` helper.                            |
| [`components/analytics/posthog-provider.tsx`](../components/analytics/posthog-provider.tsx) | Calls `initPostHog()` once on mount.                                         |
| [`components/analytics/identity-gate.tsx`](../components/analytics/identity-gate.tsx)       | Identity form; fires `tester_identified`; calls `identifyTester`.            |
| [`hooks/use-session-analytics.ts`](../hooks/use-session-analytics.ts)                       | `session_started` / `session_ended` / `agent_error` on LiveKit state edges.  |
| [`hooks/use-view-analytics.ts`](../hooks/use-view-analytics.ts)                             | `agent_view_shown` on view change; `agent_view_detail_shown` on detail open. |

## How it's wired up

1. **Init.** `PostHogProvider` runs `initPostHog()` in a mount effect. Init is guarded:
   it no-ops when `NODE_ENV === 'development'` (so `next dev` never tracks), when there's
   no `NEXT_PUBLIC_POSTHOG_KEY`, and on the server. It also only ever inits once.
2. **Identify.** `IdentityGate` reads a stored identity or shows a form. On submit it
   persists the identity, calls `identifyTester(email, name)` (PostHog `identify`, keyed
   by email), and fires `tester_identified`. The same identity is also passed to the
   LiveKit token route so the LiveKit participant correlates to the PostHog person.
3. **Capture.** The two hooks are mounted in `AppSetup` ([`components/layout/app.tsx`](../components/layout/app.tsx))
   and fire events off React/LiveKit state transitions.

## Disabled by default, no-op everywhere

`captureEvent` / `identifyTester` short-circuit unless `initPostHog()` actually
initialized. That means **calling analytics functions is always safe** — in dev, in
tests, and when no key is set, they do nothing. You never need to guard a call site
with an `if`. Config lives in `.env`:

```bash
# .env.example
NEXT_PUBLIC_POSTHOG_KEY=          # blank → analytics fully disabled (no-op)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Current events

| Event                     | Fired from              | Payload                                             |
| ------------------------- | ----------------------- | --------------------------------------------------- |
| `tester_identified`       | `identity-gate.tsx`     | `{ name, email }`                                   |
| `session_started`         | `use-session-analytics` | `{ voice_id: string \| null }`                      |
| `session_ended`           | `use-session-analytics` | `{ duration_seconds, voice_id: string \| null }`    |
| `agent_error`             | `use-session-analytics` | `{ reasons: string[], duration_seconds }`           |
| `agent_view_shown`        | `use-view-analytics`    | `{ view_type: string }`                             |
| `agent_view_detail_shown` | `use-view-analytics`    | `{ view_type, detail_id, source: 'agent'\|'user' }` |

## Adding a new event

### Checklist

1. **Declare the event** in [`lib/analytics/events.ts`](../lib/analytics/events.ts) —
   both the name (in `ANALYTICS_EVENTS`) and its payload shape (in `AnalyticsEventProps`):

   ```ts
   export const ANALYTICS_EVENTS = {
     // ...existing
     bookingConfirmed: 'booking_confirmed', // ← add here
   } as const;

   export type AnalyticsEventProps = {
     // ...existing
     [ANALYTICS_EVENTS.bookingConfirmed]: { booking_id: string; nights: number };
   };
   ```

   `captureEvent` is generic over the event name, so the payload type is enforced at
   every call site. Forgetting the `AnalyticsEventProps` entry is a type error.

2. **Capture it** from wherever the event happens — call `captureEvent`:

   ```ts
   import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
   import { captureEvent } from '@/lib/analytics/posthog';

   captureEvent(ANALYTICS_EVENTS.bookingConfirmed, { booking_id, nights });
   ```

   Reference the event via `ANALYTICS_EVENTS.x`, never a raw string literal.

3. **Where to put the capture call:**
   - Reacting to **LiveKit / session state** (connection, agent state, transcription)?
     Add it to an existing hook or write a new `hooks/use-*-analytics.ts` and mount it
     in `AppSetup`. Use refs + effect edges to fire exactly once per transition —
     follow `use-session-analytics.ts`.
   - Reacting to **agent-driven view** changes? `use-view-analytics.ts`.
   - Reacting to a **direct user action** (button click, form submit)? Fire it inline in
     the handler, like `tester_identified` in `identity-gate.tsx`.

4. **Test the logic** (not the wiring). See below.

### Conventions

- **Names** are `snake_case` (`booking_confirmed`) and **stable** — PostHog insights key
  off them, so renaming an event breaks dashboards. The `ANALYTICS_EVENTS` object keys are
  `camelCase`; their string values are the wire names.
- **Payload keys** are `snake_case` (`voice_id`, `duration_seconds`).
- **Durations** in seconds, via `computeDurationSeconds` — don't send raw millisecond deltas.
- **Never send PII you don't need.** Name/email go through `identify`, not into arbitrary
  event payloads. Session replay masks input text by default — keep it that way.
- **Fire-once discipline.** State-driven events must guard against re-firing on re-render
  (the `wasConnectedRef` / `erroredRef` pattern). An effect that captures on every render
  pollutes the data.
- **Don't init or capture outside the wrapper.** No component imports `posthog-js`.

## Testing

Per [`testing.md`](./testing.md), we unit-test `lib/**` logic, not React components.

- **The wrapper** has tests in [`lib/analytics/posthog.test.ts`](../lib/analytics/posthog.test.ts):
  no-op without a key, inits once, forwards events when configured, never inits in dev.
  `posthog-js` is mocked because it's third-party (the "no mocks for code we own" rule
  doesn't apply to external libs). `resetAnalyticsForTests()` clears the module-level init
  flag between tests.
- **Pure helpers** (`duration.ts`, `identity.ts`) get straight unit tests next to them.
- **The hooks and gate** are not unit-tested — they're thin glue over LiveKit/React state.
  Verify them by running a real session with a key set. If you extract non-trivial logic
  (e.g. an edge-detection helper), pull it into `lib/` and test it there.
