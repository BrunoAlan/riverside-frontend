# User Testing Analytics — Design Spec

**Date:** 2026-06-02
**Status:** Draft — pending user review
**Owner:** Alan Bruno

## Goal

Enable lightweight **user-testing analytics** for the Riverside voice agent
without building any management system of our own. Three needs:

1. A **simple identification gate** — every tester declares who they are (name +
   email) before they can use the app. No real auth, no passwords, no accounts.
2. **Identify who did what** — events tied to a known person.
3. **Usage statistics** — session counts, durations, errors, drop-off, and screen
   recordings — viewed entirely in **PostHog** (no custom dashboards, no DB).

All storage and visualization is delegated to PostHog Cloud. The app only
captures identity and emits events.

## Scope

In scope:

- A **blocking** `IdentityGate` over `/agent`: no identity in `localStorage` ⇒
  show a name + email form; nothing past it renders (the LiveKit session never
  mounts) until the tester identifies. Includes a recording-notice line.
- A `PostHogProvider` that initializes `posthog-js` once, with **autocapture**
  and **session replay** enabled.
- `posthog.identify(email, { name })` on gate submit, plus a `tester_identified`
  event.
- A `use-session-analytics` hook (mounted in `AppSetup`, inside the
  `AgentSessionProvider`) that emits `session_started`, `session_ended`
  (with `duration_seconds`), and `agent_error`, derived from LiveKit connection
  state and agent failure state.
- A `use-view-analytics` hook that emits `agent_view_shown { view_type }` on each
  `uiViewStore` view change.
- Set the tester's `email` as the LiveKit **participant identity** so voice
  sessions correlate to the tester.
- `posthog-js` dependency, two `NEXT_PUBLIC_` env vars, `.env.example` update.
- Unit tests for the identity store, the no-op-without-key behavior, and the
  pure duration helper.

Out of scope (deferred):

- Real authentication (passwords, social login, magic links).
- Any self-hosted PostHog / custom backend / database.
- Custom in-app dashboards — all analysis happens in PostHog.
- Capturing **conversation content** (what the user or agent said). The voice
  transcript is not sent to PostHog.
- Specific in-panel interaction tracking (open city/cabin detail, chat usage,
  camera/screenshare, add-on accept/reject). Only view-level changes are tracked.
- A consent/cookie banner beyond the inline recording notice. (Flag for later if
  this beta ever faces EU end users.)

## Non-goals

- No verification of declared identity — for user testing, self-declared name +
  email is exactly the requirement.
- No changes to `app-config.ts`. Analytics is not branding/feature-flag config;
  it is wired via env + its own module.
- No edits to `components/ui/` (shadcn primitives) by hand.

## Architecture

New units, each small and single-purpose:

| File | Role |
| --- | --- |
| `lib/analytics/posthog.ts` | `initPostHog()` (idempotent) + typed `capture*` helpers. **No-op when the key is absent.** Sole place that touches the `posthog-js` singleton. |
| `lib/analytics/identity.ts` | `readIdentity()` / `writeIdentity()` over `localStorage` + `TesterIdentity` type + validation. No React. |
| `lib/analytics/events.ts` | Event-name constants and payload types (the wire contract below). |
| `components/analytics/posthog-provider.tsx` | `'use client'`. Calls `initPostHog()` once on mount; renders `children`. |
| `components/analytics/identity-gate.tsx` | `'use client'`. Reads identity; if absent renders the form and **blocks**; on submit persists + identifies; if present renders `children`. |
| `hooks/use-session-analytics.ts` | Emits `session_started` / `session_ended` / `agent_error` from LiveKit state. |
| `hooks/use-view-analytics.ts` | Emits `agent_view_shown` on `uiViewStore` changes. |

### Mount point — `app/agent/page.tsx`

The server page composes the client wrappers around the existing `App`:

```tsx
return (
  <PostHogProvider>
    <IdentityGate>
      <App appConfig={appConfig} />
    </IdentityGate>
  </PostHogProvider>
);
```

- `PostHogProvider` sits **above** the gate so `identify()` works at submit time.
- `IdentityGate` blocks the whole `App` subtree (and thus `useSession`) until the
  tester is identified — no anonymous sessions are possible.
- `appConfig` is the only prop crossing the boundary and is already serializable.

### Hook placement

`use-session-analytics` and `use-view-analytics` are called from `AppSetup`
(`components/layout/app.tsx`) — it already runs inside `AgentSessionProvider`
next to `useAgentErrors`/`useUiCommandTransport`, exactly the context these
hooks need (`useSessionContext`, `useAgent`, `useUiView`).

## Data flow

```
Tester opens /agent
   │
   ▼
PostHogProvider.initPostHog()  (autocapture + session replay)
   │
   ▼
IdentityGate: readIdentity() from localStorage
   ├─ none → form (name + email, recording notice) → writeIdentity()
   │           → posthog.identify(email, { name }) → capture(tester_identified)
   │           → render App
   └─ some → posthog.identify(email, { name }) (silent) → render App
   │
   ▼
Welcome view → "Start" → session.start() connects to LiveKit
   │           (email is passed as the LiveKit participant identity)
   ▼
use-session-analytics watches isConnected:
   false→true ⇒ session_started { voice_id }            (store t0)
   true→false ⇒ session_ended  { duration_seconds, voice_id }
   agent.state === 'failed' ⇒ agent_error { reasons, duration_seconds }
use-view-analytics watches uiViewStore:
   view change ⇒ agent_view_shown { view_type }
```

## Event contract (`lib/analytics/events.ts`)

| Event | Properties | Answers |
| --- | --- | --- |
| `tester_identified` | `name`, `email` | who started testing, and when |
| `session_started` | `voice_id` | sessions per tester |
| `session_ended` | `duration_seconds`, `voice_id` | how long each session lasted |
| `agent_error` | `reasons: string[]`, `duration_seconds` | connection/session failures |
| `agent_view_shown` | `view_type` | which parts of the flow get used |

**Person properties** (via `identify`): `name`, `email`.

**Derived in PostHog, no code:**

- **Drop-off funnel:** `tester_identified → session_started → session_ended`.
- **Frustration:** `session_ended` with low `duration_seconds`.
- **Retention / cohorts:** returning testers, testers who hit an error, etc.
- **Session replay:** screen recording of each session, linked to the identified
  person, openable straight from any event.

## PostHog initialization (`lib/analytics/posthog.ts`)

- `initPostHog()` reads `process.env.NEXT_PUBLIC_POSTHOG_KEY` and
  `process.env.NEXT_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`).
- **No key ⇒ return early.** Every `capture*` / `identify*` helper also checks an
  `isInitialized` flag and no-ops. This keeps local dev, tests, and CI free of
  network calls and of a hard PostHog dependency at runtime.
- Init options: `autocapture: true`, `capture_pageview: true`,
  `session_recording` enabled. Session replay **masks all input text by default**
  (PostHog default) so the name/email typed into the gate is never recorded.
- Idempotent — calling twice (StrictMode double-mount) initializes once.

## Identity store (`lib/analytics/identity.ts`)

```ts
type TesterIdentity = { name: string; email: string };
```

- `readIdentity(): TesterIdentity | null` — parses the `localStorage` key; returns
  `null` on missing/invalid JSON or missing fields (defensive parse, never throws).
- `writeIdentity(identity: TesterIdentity): void`.
- Single `localStorage` key, e.g. `riverside.tester-identity`.
- Pure module (no React) so it is trivially unit-testable.

## Identity gate (`components/analytics/identity-gate.tsx`)

- On mount, `readIdentity()`. While unresolved (first client render), render
  nothing to avoid a hydration flash; once resolved:
  - identity present → `identify()` silently, render `children`.
  - identity absent → render a centered card (reusing `Card` / `Input` /
    `Button` primitives, beige palette, matching `WelcomeView`) with:
    - name + email fields (email validated as non-empty + basic email shape),
    - a short **recording notice** ("Esta sesión se graba con fines de prueba"),
    - a submit button that `writeIdentity()`, `identify()`,
      `capture(tester_identified)`, then reveals `children`.
- Blocking: `children` is not rendered until identity exists.

## LiveKit participant identity

`getLocalTokenSource` (in `lib/utils.ts`) currently mints the token source for
`useSession`. The tester's `email` is threaded in as the participant `identity`
so the LiveKit session (and any server-side logs) correlate to the tester. Exact
wiring (read identity at token-source construction vs. pass through context) is
finalized in the plan; if identity is somehow absent the token source falls back
to today's behavior.

## Config & dependencies

- **Dependency:** `pnpm add posthog-js`.
- **Env (`.env.example`):**

  ```env
  # Analytics (PostHog). Leave blank to disable analytics entirely.
  NEXT_PUBLIC_POSTHOG_KEY=
  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
  ```

- No `app-config.ts` changes.

## Tests (vitest, co-located)

- `lib/analytics/identity.test.ts` — `write` then `read` round-trips; `read`
  returns `null` for missing key, invalid JSON, and missing fields.
- `lib/analytics/posthog.test.ts` — with no key, `capture*`/`identify*` are
  no-ops (PostHog singleton never called); with a key + mocked `posthog-js`, they
  forward the right event name and properties.
- `lib/analytics/duration.test.ts` — pure `computeDurationSeconds(t0, t1)` helper
  extracted from `use-session-analytics` (rounding, zero, ordering).

Hook/component integration tests (gate, session hook) are out of scope, matching
the repo's existing test depth; the duration math and the no-op behavior — the
parts most likely to break silently — are covered by pure unit tests.

## Risks / open questions

- **PostHog free-tier limits** — exact monthly event/recording allowances should
  be confirmed against current PostHog pricing, but a small beta is comfortably
  within them; a billing limit can cap spend at $0.
- **Recording consent** — an inline notice is included. A full consent banner is
  deferred; revisit before exposing the beta to EU end users.
- **`Date.now()` for duration** — `use-session-analytics` runs only in the
  browser (client hook), so wall-clock access is fine here; the pure
  `computeDurationSeconds` takes timestamps as args and stays clock-free for
  testing.
- **Token-source identity wiring** — final shape (where `email` is injected into
  the LiveKit token source) decided in the implementation plan.

## Out of this spec (future work)

- Tracking specific in-panel interactions (detail opens, chat, camera).
- Sending conversation transcript or quality signals to analytics.
- Real authentication if the testing program outgrows self-declared identity.
- A proper consent/cookie banner.
