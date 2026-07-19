# Agent-driven suggestions + command drift fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the remaining frontend side of `docs/2026-07-18-excursions-navigation-contract.md`: the `show_suggestions` command (backend-driven pills with static fallback) and fixes for three commands the frontend currently drops on `safeParse`.

**Architecture:** A new `agentSuggestions` slice in `ui-view-store` (parallel to `bookingSummary`), populated by a new `show_suggestions` Zod command and consumed by the existing `SuggestionPillsContainer` as an override of the static catalog. Schema fixes align `soft_redirect`, `add_experience_to_basket`, and `set_booking_summary` with what the backend actually emits.

**Tech Stack:** Next.js / React, Zustand (vanilla store + hook), Zod v3 discriminated union, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-agent-suggestions-and-command-drift-design.md`

## Global Constraints

- Package manager is `pnpm` — never `npm` or `yarn`.
- Never edit `components/ui/` (shadcn primitives).
- Tests live next to the code they cover (`foo.ts` ↔ `foo.test.ts`).
- Branch: `feat/agent-suggestions-command-drift` (already created; spec is committed on it).
- Before any push/merge: `pnpm lint` and `pnpm test` must both pass.
- Run a single test file with `pnpm test <path>` (Vitest).

---

### Task 1: `soft_redirect` takes the backend shape; hint overlay dev-only

The backend emits `{reasonCode, suggestedIntent}`; the frontend schema expects `{reason_code, missing}` so every `soft_redirect` is dropped. The backend shape becomes canonical. `HintOverlay` (the only consumer) becomes dev-only.

**Files:**
- Modify: `lib/agent-ui/commands.ts:18-24`
- Modify: `lib/agent-ui/ui-view-types.ts:47`
- Modify: `lib/agent-ui/ui-view-store.ts:98-107`
- Modify: `components/agent-ui/hint-overlay.tsx`
- Test: `lib/agent-ui/commands.test.ts:14-23`, `lib/agent-ui/ui-view-store.test.ts:113-144`

**Interfaces:**
- Produces: `SoftRedirect` payload `{ reasonCode: string }`; `UiHint = { type: 'soft_redirect'; reasonCode: string }` (the `missing` field is deleted). No other task consumes these.

- [ ] **Step 1: Update the schema tests to the backend shape**

In `lib/agent-ui/commands.test.ts`, replace the test at lines 14-23 with:

```ts
  it('parses soft_redirect with the backend payload shape', () => {
    const result = UiCommand.parse({
      type: 'soft_redirect',
      correlationId: 'abc-123',
      payload: { reasonCode: 'MISSING_DATE_PREFERENCE', suggestedIntent: 'provide_preferences' },
    });
    if (result.type !== 'soft_redirect') throw new Error('discriminator failed');
    expect(result.payload.reasonCode).toBe('MISSING_DATE_PREFERENCE');
  });

  it('rejects soft_redirect without reasonCode', () => {
    const result = UiCommand.safeParse({
      type: 'soft_redirect',
      correlationId: 'abc-123',
      payload: { reason_code: 'MISSING_DATE_PREFERENCE' },
    });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Update the store tests**

In `lib/agent-ui/ui-view-store.test.ts`, the test at lines 113-131 (`applyCommand(soft_redirect) sets hint without changing view`) becomes:

```ts
  it('applyCommand(soft_redirect) sets hint without changing view', () => {
    store.getState().applyCommand({
      type: 'show_discovery_canvas',
      correlationId: 'c1',
    });
    store.getState().applyCommand({
      type: 'soft_redirect',
      correlationId: 'c2',
      payload: { reasonCode: 'MISSING_DATE' },
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.hint).toEqual({
      type: 'soft_redirect',
      reasonCode: 'MISSING_DATE',
    });
    expect(s.lastCorrelationId).toBe('c2');
  });
```

In the test at lines 133-144 (`non-hint command clears existing hint`), change the `soft_redirect` payload line to `payload: { reasonCode: 'MISSING_DATE' },`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `reasonCode` is rejected by the current schema (`reason_code` required).

- [ ] **Step 4: Update schema, type, store, and overlay**

`lib/agent-ui/commands.ts` — replace the `SoftRedirect` definition:

```ts
const SoftRedirect = Base.extend({
  type: z.literal('soft_redirect'),
  // Matches what the backend actually emits: {reasonCode, suggestedIntent}.
  // `suggestedIntent` is renderer steering, deliberately not modeled here.
  payload: z.object({
    reasonCode: z.string(),
  }),
});
```

`lib/agent-ui/ui-view-types.ts:47`:

```ts
export type UiHint = { type: 'soft_redirect'; reasonCode: string };
```

`lib/agent-ui/ui-view-store.ts` — the `soft_redirect` case:

```ts
                case 'soft_redirect':
                  return {
                    hint: {
                      type: 'soft_redirect',
                      reasonCode: cmd.payload.reasonCode,
                    },
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
```

`components/agent-ui/hint-overlay.tsx` — full new content:

```tsx
'use client';

import { useUiHint } from '@/lib/agent-ui/hooks';

// Raw debug surface: soft_redirect has no user-facing UX (the agent's spoken
// reply is the recovery), so the banner only exists for development.
const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

export function HintOverlay() {
  const hint = useUiHint();
  if (!IN_DEVELOPMENT) return null;
  if (!hint) return null;
  if (hint.type === 'soft_redirect') {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 shadow">
        {hint.reasonCode}
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts components/agent-ui/hint-overlay.tsx
git commit -m "fix(commands): soft_redirect takes the backend payload shape, hint overlay dev-only"
```

---

### Task 2: `add_experience_to_basket` parses the backend's minimal payload

The backend sends `{experience_id}` only; the frontend requires `day` and `passenger_count`, so the command is always dropped.

**Files:**
- Modify: `lib/agent-ui/commands.ts:224-231`
- Modify: `lib/agent-ui/ui-view-store.ts:201-213`
- Test: `lib/agent-ui/commands.test.ts` (in the `add_experience_to_basket` describe, ~line 769), `lib/agent-ui/ui-view-store.test.ts` (near the tests at ~line 491)

**Interfaces:**
- Produces: `AddExperienceToBasket` payload `{ experience_id: string; day?: string; passenger_count?: number }`. Reducer records into `addedExperiences` only when `day` is present.

- [ ] **Step 1: Write the failing tests**

`lib/agent-ui/commands.test.ts`, inside `describe('add_experience_to_basket', ...)`:

```ts
  it('parses the minimal backend payload (experience_id only)', () => {
    const result = UiCommand.parse({
      type: 'add_experience_to_basket',
      correlationId: 'e2',
      payload: { experience_id: 'signature_vienna_belvedere_palace' },
    });
    if (result.type !== 'add_experience_to_basket') throw new Error('discriminator failed');
    expect(result.payload.experience_id).toBe('signature_vienna_belvedere_palace');
    expect(result.payload.day).toBeUndefined();
  });
```

`lib/agent-ui/ui-view-store.test.ts`, next to the existing `add_experience_to_basket` tests:

```ts
  it('applyCommand(add_experience_to_basket) without a day records nothing', () => {
    store.getState().applyCommand({
      type: 'add_experience_to_basket',
      correlationId: 'e9',
      payload: { experience_id: 'belvedere' },
    });
    const s = store.getState();
    expect(s.addedExperiences).toEqual([]);
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('e9');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — schema requires `day` and `passenger_count`.

- [ ] **Step 3: Relax the schema and guard the reducer**

`lib/agent-ui/commands.ts`:

```ts
const AddExperienceToBasket = Base.extend({
  type: z.literal('add_experience_to_basket'),
  // The backend currently sends only `experience_id` (select_experience.py:193).
  // `day` and `passenger_count` stay optional so the command parses today;
  // sync_itinerary_experiences carries the full basket in the same batch.
  payload: z.object({
    experience_id: z.string(),
    day: z.string().optional(),
    passenger_count: z.number().int().optional(),
  }),
});
```

`lib/agent-ui/ui-view-store.ts` — the `add_experience_to_basket` case gains an early return:

```ts
                case 'add_experience_to_basket': {
                  const { experience_id, day } = cmd.payload;
                  // Without a day there is nothing to key the card badge on;
                  // the sync command in the same batch is the source of truth.
                  if (!day) {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  const exists = state.addedExperiences.some(
                    (e) => e.experienceId === experience_id && e.day === day
                  );
                  return {
                    addedExperiences: exists
                      ? state.addedExperiences
                      : [...state.addedExperiences, { experienceId: experience_id, day }],
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts`
Expected: PASS (including the pre-existing `add_experience_to_basket` tests, unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "fix(commands): add_experience_to_basket accepts the minimal backend payload"
```

---

### Task 3: remove the `slots` cap on `set_booking_summary`

The backend emits one slot per basket experience with no cap (`_booking_summary_ui.py:136-150`); the frontend's `.max(6)` drops the whole command past 6 slots.

**Files:**
- Modify: `lib/agent-ui/commands.ts:104-111`
- Test: `lib/agent-ui/commands.test.ts:660-667`

**Interfaces:**
- Produces: `BookingSummarySnapshot.slots` unbounded. The component (`booking-summary.tsx:134`) already renders whatever arrives; no render cap is added.

- [ ] **Step 1: Replace the rejection test with an acceptance test**

`lib/agent-ui/commands.test.ts` — replace `it('rejects more than 6 slots', ...)` (lines 660-667) with:

```ts
  it('accepts more than 6 slots (backend emits one per basket experience, uncapped)', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      label: `Experience ${i + 1}`,
      state: 'filled' as const,
    }));
    const result = UiCommand.parse({
      type: 'set_booking_summary',
      correlationId: 'b7',
      payload: { ...validPayload, slots: many },
    });
    if (result.type !== 'set_booking_summary') throw new Error('discriminator failed');
    expect(result.payload.slots).toHaveLength(8);
  });
```

(`validPayload` already exists in that describe block — see line 655.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: FAIL — `.max(6)` rejects the 8-slot array.

- [ ] **Step 3: Remove the cap**

`lib/agent-ui/commands.ts` — in `BookingSummarySnapshot`, change:

```ts
  slots: z
    .array(
      z.object({
        label: z.string(),
        state: z.enum(['active', 'filled', 'empty']),
      })
    )
    .max(6),
```

to:

```ts
  // Uncapped: the backend emits one slot per basket experience with no limit
  // (_booking_summary_ui.py:136-150). A length cap here would drop the whole
  // command and silently freeze the summary.
  slots: z.array(
    z.object({
      label: z.string(),
      state: z.enum(['active', 'filled', 'empty']),
    })
  ),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "fix(commands): drop the 6-slot cap on set_booking_summary"
```

---

### Task 4: `show_suggestions` command schema

**Files:**
- Modify: `lib/agent-ui/commands.ts` (new command + union entry at lines 248-263)
- Test: `lib/agent-ui/commands.test.ts`

**Interfaces:**
- Produces: `ShowSuggestions` member of `UiCommand` with `payload: { suggestions: Array<{ id: string; text: string; label?: string }> }`. Task 5's reducer consumes `cmd.payload.suggestions`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/commands.test.ts` (new describe at the end):

```ts
describe('show_suggestions', () => {
  it('parses suggestions with and without a label', () => {
    const result = UiCommand.parse({
      type: 'show_suggestions',
      correlationId: 's1',
      payload: {
        suggestions: [
          { id: 'a', text: 'What can I do in Budapest?' },
          { id: 'b', text: 'Tell me more about the Belvedere evening', label: 'Belvedere?' },
        ],
      },
    });
    if (result.type !== 'show_suggestions') throw new Error('discriminator failed');
    expect(result.payload.suggestions).toHaveLength(2);
    expect(result.payload.suggestions[0].label).toBeUndefined();
    expect(result.payload.suggestions[1].label).toBe('Belvedere?');
  });

  it('parses an empty suggestions array', () => {
    const result = UiCommand.parse({
      type: 'show_suggestions',
      correlationId: 's2',
      payload: { suggestions: [] },
    });
    if (result.type !== 'show_suggestions') throw new Error('discriminator failed');
    expect(result.payload.suggestions).toEqual([]);
  });

  it('rejects a suggestion without text', () => {
    const result = UiCommand.safeParse({
      type: 'show_suggestions',
      correlationId: 's3',
      payload: { suggestions: [{ id: 'a', label: 'No text' }] },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: FAIL — `show_suggestions` is not in the discriminated union.

- [ ] **Step 3: Add the schema and union entry**

`lib/agent-ui/commands.ts` — after `SyncItineraryExperiences`:

```ts
const ShowSuggestions = Base.extend({
  type: z.literal('show_suggestions'),
  payload: z.object({
    // No length cap: the container renders at most 6; the parser never drops
    // a command over noise.
    suggestions: z.array(
      z.object({
        id: z.string(),
        /** Sent to the chat when tapped. */
        text: z.string(),
        /** Visible label; falls back to `text`. */
        label: z.string().optional(),
      })
    ),
  }),
});
```

Add `ShowSuggestions,` to the `UiCommand` discriminated union array.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add show_suggestions command schema"
```

---

### Task 5: `agentSuggestions` slice in the store

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: `show_suggestions` command from Task 4.
- Produces:
  - State `agentSuggestions: { pills: SuggestionPill[]; key: string } | null` (`SuggestionPill` from `@/lib/suggestions/pills`). `key` is the delivering command's `correlationId` (or `'dev'`), used by the container to reset dismissal.
  - Action `setAgentSuggestionsFromDev(pills: SuggestionPill[] | null): void`.
  - Hooks `useAgentSuggestions()` and `useSetAgentSuggestionsFromDev()`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/ui-view-store.test.ts` (inside the top-level describe):

```ts
  describe('agent suggestions', () => {
    const suggestionsCommand = (correlationId: string) =>
      ({
        type: 'show_suggestions',
        correlationId,
        payload: {
          suggestions: [
            { id: 'a', text: 'What can I do in Budapest?' },
            { id: 'b', text: 'Tell me more about Belvedere', label: 'Belvedere?' },
          ],
        },
      }) as const;

    const itinerary = {
      id: 'danube_legends',
      name: 'Danube Legends',
      duration: { days: 12, nights: 11 },
      match_score: 0.6667,
      departure_dates: ['2026-04-22'],
      center: [16.57, 48.15] as [number, number],
      zoom: 6,
      cities: [
        {
          id: 'budapest',
          name: 'Budapest',
          country: 'Hungary',
          image: 'https://res.cloudinary.com/demo/image/upload/budapest.jpg',
          days: 'Days 1, 2, 6 & 7',
          lon: 19.0402,
          lat: 47.4979,
        },
      ],
    };

    it('initializes with agentSuggestions null', () => {
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('show_suggestions maps wire pills, keyed by correlationId', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      expect(store.getState().agentSuggestions).toEqual({
        key: 's1',
        pills: [
          { id: 'a', label: 'What can I do in Budapest?', message: 'What can I do in Budapest?' },
          { id: 'b', label: 'Belvedere?', message: 'Tell me more about Belvedere' },
        ],
      });
      expect(store.getState().source).toBe('agent');
    });

    it('show_suggestions with an empty list clears the override', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_suggestions',
        correlationId: 's2',
        payload: { suggestions: [] },
      });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('a view-replacing command clears the override', () => {
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c2',
        payload: { itinerary },
      });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('field-level commands keep the override', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().applyCommand({
        type: 'show_itinerary_tab',
        correlationId: 'c2',
        payload: { tab: 'excursions' },
      });
      expect(store.getState().agentSuggestions?.key).toBe('s1');
    });

    it('setViewFromUser keeps the override for the same view type', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().setViewFromUser({ type: 'itinerary', itinerary, activeTab: 'excursions' });
      expect(store.getState().agentSuggestions?.key).toBe('s1');
    });

    it('setViewFromUser clears the override when the view type changes', () => {
      store.getState().applyCommand({
        type: 'show_itinerary_options',
        correlationId: 'c1',
        payload: { itinerary },
      });
      store.getState().applyCommand(suggestionsCommand('s1'));
      store.getState().setViewFromUser({ type: 'start' });
      expect(store.getState().agentSuggestions).toBeNull();
    });

    it('setAgentSuggestionsFromDev sets and clears the override with source dev', () => {
      store
        .getState()
        .setAgentSuggestionsFromDev([{ id: 'd1', label: 'Dev pill', message: 'Dev pill' }]);
      expect(store.getState().agentSuggestions).toEqual({
        key: 'dev',
        pills: [{ id: 'd1', label: 'Dev pill', message: 'Dev pill' }],
      });
      expect(store.getState().source).toBe('dev');
      store.getState().setAgentSuggestionsFromDev(null);
      expect(store.getState().agentSuggestions).toBeNull();
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — `agentSuggestions` / `setAgentSuggestionsFromDev` do not exist.

- [ ] **Step 3: Implement the slice**

`lib/agent-ui/ui-view-store.ts`:

1. Add the import:

```ts
import type { SuggestionPill } from '@/lib/suggestions/pills';
```

2. Extend `UiViewState`:

```ts
  // Backend-driven pill override. `null` = no override, the static catalog
  // renders. `key` identifies the delivery (correlationId, or 'dev') so the
  // container can reset its dismissed state when fresh pills arrive.
  agentSuggestions: { pills: SuggestionPill[]; key: string } | null;
  setAgentSuggestionsFromDev: (pills: SuggestionPill[] | null) => void;
```

3. Initial value alongside the others: `agentSuggestions: null,`.

4. New reducer case (before the `default`):

```ts
                case 'show_suggestions': {
                  const { suggestions } = cmd.payload;
                  return {
                    // An empty list clears the override; static pills return.
                    agentSuggestions: suggestions.length
                      ? {
                          pills: suggestions.map((s) => ({
                            id: s.id,
                            label: s.label ?? s.text,
                            message: s.text,
                          })),
                          key: cmd.correlationId,
                        }
                      : null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
```

5. Add `agentSuggestions: null,` to the four view-replacing cases — `show_discovery_canvas`, `show_itinerary_options`, `show_destination_detail`, `show_cabin_options` — next to their `hint: null,` line. Field-level cases (`show_city_detail`, `show_experience_detail`, `show_itinerary_tab`, `show_cabin_detail`) stay untouched.

6. `setViewFromDev` and `setViewFromUser` become state functions that clear the override only on a view-type change:

```ts
        setViewFromDev: (view) =>
          set(
            (state) => ({
              view,
              hint: null,
              source: 'dev',
              lastCorrelationId: null,
              // Backend pills are scoped to the view they arrived on.
              agentSuggestions: state.view.type === view.type ? state.agentSuggestions : null,
            }),
            false,
            'setViewFromDev'
          ),

        setViewFromUser: (view) =>
          set(
            (state) => ({
              view,
              hint: null,
              source: 'user',
              lastCorrelationId: null,
              agentSuggestions: state.view.type === view.type ? state.agentSuggestions : null,
            }),
            false,
            'setViewFromUser'
          ),
```

7. New dev action, next to `setBookingSummaryFromDev`:

```ts
        setAgentSuggestionsFromDev: (pills) =>
          set(
            {
              agentSuggestions: pills ? { pills, key: 'dev' } : null,
              source: 'dev',
              lastCorrelationId: null,
            },
            false,
            'setAgentSuggestionsFromDev'
          ),
```

`lib/agent-ui/hooks.ts` — add:

```ts
export const useAgentSuggestions = () => useUiViewStore((s) => s.agentSuggestions);
export const useSetAgentSuggestionsFromDev = () =>
  useUiViewStore((s) => s.setAgentSuggestionsFromDev);
```

- [ ] **Step 4: Run the full store and command tests**

Run: `pnpm test lib/agent-ui/`
Expected: PASS — new tests and all pre-existing ones (`setItineraryTabFromUser` keeps working because it already spreads `state.view` without touching `agentSuggestions`).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts lib/agent-ui/hooks.ts
git commit -m "feat(suggestions): agentSuggestions slice driven by show_suggestions"
```

---

### Task 6: container renders agent pills over the static catalog

**Files:**
- Modify: `components/agent-ui/suggestion-pills.tsx:66-108`

**Interfaces:**
- Consumes: `useAgentSuggestions()` from Task 5 (`{ pills, key } | null`).
- Produces: no new exports; behavior change only.

No component test file exists for this container (repo has no React component tests); the logic it composes is covered by the store tests (Task 5) and `pills.test.ts`. Verification is lint + the dev panel flow added in Task 7.

- [ ] **Step 1: Wire the override into `SuggestionPillsContainer`**

In `components/agent-ui/suggestion-pills.tsx`:

1. Import the hook — extend the existing `@/lib/agent-ui/hooks` import:

```ts
import {
  useAgentSuggestions,
  useUiSource,
  useUiView,
  useVisibleBookingSummary,
} from '@/lib/agent-ui/hooks';
```

2. Add a module constant under `IN_DEVELOPMENT`:

```ts
/** Contract doc §7: more than ~6 pills is visual noise, so cap the render. */
const MAX_PILLS = 6;
```

3. Inside `SuggestionPillsContainer`, replace

```ts
  const pills = pillsForView(view.type, suggestionPills);
  const currentKey = viewKey(view);
```

with

```ts
  const agentSuggestions = useAgentSuggestions();

  // Backend pills override the static catalog when present (hybrid model).
  // The dismissal key tracks the delivery, so a fresh show_suggestions
  // un-dismisses the row even on the same view.
  const pills = (agentSuggestions?.pills ?? pillsForView(view.type, suggestionPills)).slice(
    0,
    MAX_PILLS
  );
  const currentKey = agentSuggestions ? `agent:${agentSuggestions.key}` : viewKey(view);
```

Everything else (connection gate, dismissal, `onSelect` rollback) is unchanged — agent pills always carry `message`, so `pill.message ?? pill.label` sends the right text.

- [ ] **Step 2: Lint and run the suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/suggestion-pills.tsx
git commit -m "feat(suggestions): render agent pills over the static catalog"
```

---

### Task 7: dev mock + dev panel entry

**Files:**
- Modify: `lib/dev/mocks.ts` (append after `SYNC_EXPERIENCES_MOCKS`, ~line 595)
- Modify: `lib/dev/dev-panel.tsx`

**Interfaces:**
- Consumes: `useSetAgentSuggestionsFromDev()` from Task 5; `SuggestionPill` type.
- Produces: `AGENT_SUGGESTIONS_MOCKS: readonly AgentSuggestionsMock[]` where `AgentSuggestionsMock = { id: string; label: string; pills: SuggestionPill[] | null }`.

- [ ] **Step 1: Add the mocks**

`lib/dev/mocks.ts` — add to the imports:

```ts
import type { SuggestionPill } from '@/lib/suggestions/pills';
```

Append after `SYNC_EXPERIENCES_MOCKS`:

```ts
export interface AgentSuggestionsMock {
  id: string;
  label: string;
  /** `null` clears the override so the static catalog returns. */
  pills: SuggestionPill[] | null;
}

export const AGENT_SUGGESTIONS_MOCKS: readonly AgentSuggestionsMock[] = [
  {
    id: 'itinerary_specific',
    label: 'Itinerary-specific (Danube Legends)',
    pills: [
      {
        id: 'sug-budapest',
        label: 'What can I do in Budapest?',
        message: 'What can I do in Budapest?',
      },
      {
        id: 'sug-belvedere',
        label: 'The Belvedere evening?',
        message: 'Tell me more about the VIP evening at Belvedere Palace',
      },
      {
        id: 'sug-day5',
        label: "What's on day 5?",
        message: 'What is planned for day 5 of my itinerary?',
      },
    ],
  },
  {
    id: 'overflow',
    label: 'Seven pills (render caps at 6)',
    pills: Array.from({ length: 7 }, (_, i) => ({
      id: `sug-${i + 1}`,
      label: `Suggestion ${i + 1}`,
      message: `Suggestion ${i + 1}`,
    })),
  },
  { id: 'clear', label: 'Clear (static fallback)', pills: null },
];
```

- [ ] **Step 2: Add the dev panel section**

`lib/dev/dev-panel.tsx`:

1. Extend the hooks import with `useSetAgentSuggestionsFromDev` and the mocks import with `AGENT_SUGGESTIONS_MOCKS`.

2. Inside `DevPanel`, next to the other hooks and mock-id state:

```ts
  const setAgentSuggestionsFromDev = useSetAgentSuggestionsFromDev();
  const [agentSuggestionsMockId, setAgentSuggestionsMockId] = useState(
    AGENT_SUGGESTIONS_MOCKS[0]?.id ?? ''
  );
```

3. Next to the other `apply*` helpers:

```ts
  const applyAgentSuggestions = () => {
    const chosen =
      AGENT_SUGGESTIONS_MOCKS.find((m) => m.id === agentSuggestionsMockId) ??
      AGENT_SUGGESTIONS_MOCKS[0];
    if (chosen) setAgentSuggestionsFromDev(chosen.pills);
  };
```

4. New section in the JSX, after the `itinerary experiences` block (before the `lastError` render):

```tsx
                <div className="mt-2 border-t border-white/20 pt-2">agent suggestions</div>
                <label className="block">
                  mock
                  <select
                    className="mt-1 w-full bg-white/10 px-1 py-0.5"
                    value={agentSuggestionsMockId}
                    onChange={(e) => setAgentSuggestionsMockId(e.target.value)}
                  >
                    {AGENT_SUGGESTIONS_MOCKS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={applyAgentSuggestions}
                  className="w-full rounded bg-white text-black"
                >
                  Apply suggestions
                </button>
```

- [ ] **Step 3: Lint and run the suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS (`lib/dev/mocks.test.ts` included).

- [ ] **Step 4: Commit**

```bash
git add lib/dev/mocks.ts lib/dev/dev-panel.tsx
git commit -m "feat(dev): agent suggestions mocks and dev panel entry"
```

---

### Task 8: update the contract doc + final verification

**Files:**
- Modify: `docs/2026-07-18-excursions-navigation-contract.md` (summary table at lines 325-337, annex B at lines 364-379)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update the summary table**

Replace the table under `## Resumen del trabajo` with:

```markdown
| # | Acción | Backend | Frontend |
| --- | --- | --- | --- |
| 0 | Subir `activeTab` a `UiView` | — | ✅ Hecho |
| 1 | Intent `view_excursions` | Handler nuevo | ✅ Hecho — se emite al cambiar de tab |
| 2 | Command `show_itinerary_tab` | Command nuevo | ✅ Hecho — aplicado al store |
| 3 | Detalle por voz | `experience_id` en el esquema del LLM + resolver | ✅ Hecho (incluye auto-cambio de tab) |
| 4 | Agregar por voz + marcador de origen | Lo del punto 3 + propagar `source` | ✅ El schema acepta `source`; decisión de producto: sin distinción visual, el card marcado como agregado alcanza |
| 5 | Volver a Overview | Cubierto por el punto 2 | ✅ Cubierto por el punto 2 |
| 6 | `view_itinerary` deja de ser no-op | Escribir estado | **Ya lo mandamos** |
| 7 | Command `show_suggestions` (pills) | Command nuevo + generación | ✅ Hecho — schema, store, contenedor y mock. `suggestions: []` limpia y vuelve el fallback estático; el front limpia además al cambiar de vista; se renderizan máx. 6 |
```

- [ ] **Step 2: Update annex B**

Replace the content of `### B. Dos commands se descartan en silencio` (keeping the heading) with:

```markdown
**Resuelto del lado del frontend (2026-07-19):** el schema del front ahora acepta
lo que el backend manda hoy.

| Command | Qué se alineó |
| --- | --- |
| `add_experience_to_basket` | `day` y `passenger_count` pasaron a opcionales; sin `day` el front no marca nada y `sync_itinerary_experiences` sigue siendo la fuente de verdad |
| `soft_redirect` | La forma del backend (`{reasonCode, suggestedIntent}`) es la canónica; `suggestedIntent` se ignora y el overlay de debug es solo-dev |

**Drift nuevo encontrado y también resuelto:** `set_booking_summary` — el backend
emite un slot por experience del basket **sin tope** (`_booking_summary_ui.py:136-150`)
y el front validaba `slots` con máximo 6, descartando el command entero a partir del
séptimo slot. El cap se eliminó del schema.
```

- [ ] **Step 3: Final verification**

Run: `pnpm lint && pnpm test`
Expected: both PASS, zero failures.

- [ ] **Step 4: Commit**

```bash
git add docs/2026-07-18-excursions-navigation-contract.md
git commit -m "docs(contract): mark frontend work done, record drift fixes"
```
