# Excursions Navigation — Frontend Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the entire frontend half of `docs/2026-07-18-excursions-navigation-contract.md`, so that when the backend ships its side, everything works with no further frontend change.

**Architecture:** The itinerary's active tab moves out of React local state and into the `UiView` store, which is the only thing `ui-commands` can drive. A new `show_itinerary_tab` command writes it; a new store action writes it from user taps and emits the matching intent. `show_experience_detail` additionally forces the Excursions tab so an agent-initiated detail is always visible. The command envelope gains an optional `source` field so an agent-originated command parses once the backend propagates it.

**Tech Stack:** Zustand vanilla store (`createUiViewStore`), zod schemas for the wire protocol, React 19 client components, Vitest (node environment).

## Global Constraints

- Package manager is `pnpm`. Never `npm` or `yarn`.
- Never edit `components/ui/` by hand.
- Vitest collects only `lib/**/*.test.ts`. React components are not unit-tested — they are verified visually.
- Per `conventions/testing.md:33`: a new `UiCommand` variant requires **both** a schema test in `commands.test.ts` and a reducer test in `ui-view-store.test.ts`.
- Tests use `createUiViewStore()` for a fresh store. No mocks for code we own.
- Everything built here must be **inert until the backend ships**. Emitting an intent the backend does not know is a verified silent no-op (`state_machine/engine.py:70-77` returns `allowed=false` with `new_state=current_state`; `llm/renderer.py:236-245` suppresses the render for `frontend-intent` sources). A command the backend never sends simply never arrives.
- **Intent emission must be edge-triggered on an actual tab change, never on render.** Every frontend intent appends to the backend's 3-slot `conversation_history` (`turn_handler.py:190-201`) and surfaces as `last_intent` in the next voice classification. Firing per render would evict real conversational context.
- Work happens on branch `feat/excursions-navigation-frontend`, cut from `main`.

## Decisions already made (do not re-litigate)

- **Auto-switch on detail:** when `show_experience_detail` arrives with a non-null id, the frontend switches to the Excursions tab itself. The agent sends one command and cannot get the ordering wrong.
- **No visual distinction for agent-added excursions.** An excursion the agent adds looks exactly like one the user added from the itinerary view. `source` is accepted by the schema so the command parses, and nothing renders differently. This keeps the door open without inventing UI nobody asked for.

## File structure

| File | Responsibility | Change |
| --- | --- | --- |
| `lib/agent-ui/ui-view-types.ts` | `UiView` shape | Add `activeTab` to the itinerary variant; export `ItineraryTab` |
| `lib/agent-ui/commands.ts` | Wire schemas | Add `ShowItineraryTab`; add optional `source` to `Base` |
| `lib/agent-ui/ui-view-store.ts` | Reducer + actions | Handle `show_itinerary_tab`; auto-tab on `show_experience_detail`; add `setItineraryTabFromUser` |
| `lib/agent-ui/hooks.ts` | Selectors | Add `useSetItineraryTabFromUser` |
| `components/panels/itinerary/itinerary-tabs.tsx` | Tab type owner | Re-export the type from `ui-view-types` to kill the duplicate definition |
| `components/panels/itinerary/itinerary-panel.tsx` | Tab container | Read tab from store, emit intents on change |

---

### Task 1: `activeTab` in the view type and the store

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts:29-33`
- Modify: `lib/agent-ui/ui-view-store.ts` (interface at :22-31, actions near :198)
- Modify: `lib/agent-ui/hooks.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ItineraryTab = 'overview' | 'excursions'` exported from `lib/agent-ui/ui-view-types`; `activeTab?: ItineraryTab` on the itinerary view variant; store action `setItineraryTabFromUser(tab: ItineraryTab): void`; hook `useSetItineraryTabFromUser`. All consumed by Tasks 2-4.

`activeTab` is optional and `undefined` means `'overview'`. Consumers read it as `view.activeTab ?? 'overview'`, so every existing itinerary view keeps working untouched.

- [ ] **Step 1: Write the failing test**

Append to `lib/agent-ui/ui-view-store.test.ts`:

```ts
describe('itinerary active tab', () => {
  it('setItineraryTabFromUser switches the tab and marks the source as user', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

    store.getState().setItineraryTabFromUser('excursions');

    const { view, source } = store.getState();
    if (view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(view.activeTab).toBe('excursions');
    expect(source).toBe('user');
  });

  it('setItineraryTabFromUser preserves the rest of the itinerary view', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({
      type: 'itinerary',
      itinerary: undefined,
      detailCityId: 'budapest',
    });

    store.getState().setItineraryTabFromUser('excursions');

    const { view } = store.getState();
    if (view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(view.detailCityId).toBe('budapest');
  });

  it('setItineraryTabFromUser is a no-op when the view is not an itinerary', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'start' });

    store.getState().setItineraryTabFromUser('excursions');

    expect(store.getState().view).toEqual({ type: 'start' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test ui-view-store`
Expected: FAIL — `setItineraryTabFromUser is not a function`.

- [ ] **Step 3: Add the type**

In `lib/agent-ui/ui-view-types.ts`, above the `UiView` union:

```ts
export type ItineraryTab = 'overview' | 'excursions';
```

and extend the itinerary variant (currently at :29-33):

```ts
  | {
      type: 'itinerary';
      itinerary?: ItineraryFull;
      // Which tab the itinerary view is showing. Undefined means 'overview'.
      // Lives here rather than in component state so ui-commands can drive it.
      activeTab?: ItineraryTab;
      detailCityId?: string;
      detailExperienceId?: string;
    }
```

- [ ] **Step 4: Add the store action**

In `lib/agent-ui/ui-view-store.ts`, add to the `UiViewState` interface:

```ts
  setItineraryTabFromUser: (tab: ItineraryTab) => void;
```

Import the type alongside the existing type imports:

```ts
import type { BookingSummary, ItineraryTab, UiHint, UiSource, UiView } from './ui-view-types';
```

Add the implementation next to `setViewFromUser`:

```ts
        setItineraryTabFromUser: (tab) =>
          set(
            (state) =>
              state.view.type === 'itinerary'
                ? {
                    view: { ...state.view, activeTab: tab },
                    hint: null,
                    source: 'user',
                    lastCorrelationId: null,
                  }
                : {},
            false,
            'setItineraryTabFromUser'
          ),
```

- [ ] **Step 5: Add the hook**

In `lib/agent-ui/hooks.ts`, next to `useSetViewFromUser`:

```ts
export const useSetItineraryTabFromUser = () =>
  useUiViewStore((s) => s.setItineraryTabFromUser);
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test ui-view-store`
Expected: PASS, including the three new tests.

- [ ] **Step 7: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/hooks.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): move itinerary active tab into the view store"
```

---

### Task 2: `show_itinerary_tab` command

**Files:**
- Modify: `lib/agent-ui/commands.ts`
- Modify: `lib/agent-ui/ui-view-store.ts` (the `applyCommand` switch)
- Test: `lib/agent-ui/commands.test.ts`, `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: `ItineraryTab` and `activeTab` from Task 1.
- Produces: the `show_itinerary_tab` variant on the `UiCommand` union, payload `{ tab: 'overview' | 'excursions' }`.

This is the command the contract document asks the backend to add. It does not exist on the backend yet — that is expected. The frontend handles it the day it arrives.

- [ ] **Step 1: Write the failing schema test**

Append to `lib/agent-ui/commands.test.ts`:

```ts
describe('show_itinerary_tab', () => {
  it('parses show_itinerary_tab with a valid tab', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_tab',
      correlationId: 'c1',
      payload: { tab: 'excursions' },
    });
    if (result.type !== 'show_itinerary_tab') throw new Error('discriminator failed');
    expect(result.payload.tab).toBe('excursions');
  });

  it('rejects an unknown tab', () => {
    const result = UiCommand.safeParse({
      type: 'show_itinerary_tab',
      correlationId: 'c1',
      payload: { tab: 'cabins' },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing reducer test**

Append to `lib/agent-ui/ui-view-store.test.ts`:

```ts
describe('applyCommand(show_itinerary_tab)', () => {
  it('switches the tab and marks the source as agent', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

    store.getState().applyCommand({
      type: 'show_itinerary_tab',
      correlationId: 'c1',
      payload: { tab: 'excursions' },
    });

    const { view, source } = store.getState();
    if (view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(view.activeTab).toBe('excursions');
    expect(source).toBe('agent');
  });

  it('leaves a non-itinerary view untouched', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'start' });

    store.getState().applyCommand({
      type: 'show_itinerary_tab',
      correlationId: 'c1',
      payload: { tab: 'excursions' },
    });

    expect(store.getState().view).toEqual({ type: 'start' });
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `pnpm test commands` then `pnpm test ui-view-store`
Expected: both FAIL — the schema rejects the unknown `type`, and the reducer has no case for it.

- [ ] **Step 4: Add the schema**

In `lib/agent-ui/commands.ts`, next to `ShowExperienceDetail`:

```ts
const ShowItineraryTab = Base.extend({
  type: z.literal('show_itinerary_tab'),
  payload: z.object({ tab: z.enum(['overview', 'excursions']) }),
});
```

and add `ShowItineraryTab` to the `UiCommand` discriminated union.

- [ ] **Step 5: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, inside the `applyCommand` switch, next to `show_experience_detail`:

```ts
                case 'show_itinerary_tab': {
                  if (state.view.type !== 'itinerary') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  return {
                    view: { ...state.view, activeTab: cmd.payload.tab },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS, full suite.

- [ ] **Step 7: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): add show_itinerary_tab command"
```

---

### Task 3: Auto-switch to Excursions on an agent-driven detail

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts` (the `show_experience_detail` case at :127-139)
- Test: `lib/agent-ui/ui-view-store.test.ts`

**Interfaces:**
- Consumes: `activeTab` from Task 1.
- Produces: no new API. Changes the behaviour of an existing command.

Today an agent-sent `show_experience_detail` does nothing visible when the user is on the Overview tab without a city open, because `CityExperiencesPanel` only renders under an open city (`panel-map.tsx:96-100`). Forcing the tab makes the detail always visible.

**Closing must not switch tabs.** `show_experience_detail` with `experience_id: null` is the close command; it must leave `activeTab` alone.

- [ ] **Step 1: Write the failing test**

Append to `lib/agent-ui/ui-view-store.test.ts`:

```ts
describe('applyCommand(show_experience_detail) tab behaviour', () => {
  it('switches to the excursions tab so the detail is visible', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });

    store.getState().applyCommand({
      type: 'show_experience_detail',
      correlationId: 'c1',
      payload: { experience_id: 'exp-1' },
    });

    const { view } = store.getState();
    if (view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(view.activeTab).toBe('excursions');
    expect(view.detailExperienceId).toBe('exp-1');
  });

  it('does not change the tab when closing the detail', () => {
    const store = createUiViewStore();
    store.getState().setViewFromUser({ type: 'itinerary', itinerary: undefined });
    store.getState().setItineraryTabFromUser('overview');

    store.getState().applyCommand({
      type: 'show_experience_detail',
      correlationId: 'c2',
      payload: { experience_id: null },
    });

    const { view } = store.getState();
    if (view.type !== 'itinerary') throw new Error('expected itinerary view');
    expect(view.activeTab).toBe('overview');
    expect(view.detailExperienceId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test ui-view-store`
Expected: FAIL on the first test — `activeTab` is `undefined`, not `'excursions'`.

- [ ] **Step 3: Update the reducer case**

Replace the body of the `show_experience_detail` case in `lib/agent-ui/ui-view-store.ts`:

```ts
                case 'show_experience_detail': {
                  if (state.view.type !== 'itinerary') {
                    return { source: 'agent', lastCorrelationId: cmd.correlationId };
                  }
                  const experienceId = cmd.payload.experience_id ?? undefined;
                  return {
                    view: {
                      ...state.view,
                      detailExperienceId: experienceId,
                      // Opening a detail forces the tab that can show it, so the
                      // agent needs one command instead of an ordered pair.
                      // Closing leaves the tab where the user left it.
                      activeTab: experienceId ? 'excursions' : state.view.activeTab,
                    },
                    hint: null,
                    source: 'agent',
                    lastCorrelationId: cmd.correlationId,
                  };
                }
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: PASS, full suite. Existing `show_experience_detail` tests must still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): show_experience_detail forces the excursions tab"
```

---

### Task 4: Wire the panel to the store and emit the tab intents

**Files:**
- Modify: `components/panels/itinerary/itinerary-panel.tsx`
- Modify: `components/panels/itinerary/itinerary-tabs.tsx` (re-export the shared type)

**Interfaces:**
- Consumes: `useSetItineraryTabFromUser` and `activeTab` from Task 1.
- Produces: no new API.

`itinerary-tabs.tsx:6` currently declares its own `ItineraryTab` type. Task 1 put the canonical one in `ui-view-types.ts`. Re-export rather than keeping two definitions that can drift:

```ts
// components/panels/itinerary/itinerary-tabs.tsx
import type { ItineraryTab } from '@/lib/agent-ui/ui-view-types';
export type { ItineraryTab };
```

No automated test — React component, verified visually.

**Two behaviours to preserve or add:**

1. The existing tab-switch cleanup at `itinerary-panel.tsx:23-31` (switching to Excursions with a city detail open collapses it) must survive, and must run only for user-driven switches — an agent-driven tab change goes through the reducer and never touches this handler.
2. The intent emission is the contract's actions 1 and 6, and they are the two faces of one transition: switching to Excursions emits `view_excursions`, switching to Overview emits `view_itinerary`.

- [ ] **Step 1: Rewrite the component**

Replace the body of `ItineraryPanel` in `components/panels/itinerary/itinerary-panel.tsx`:

```tsx
export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const setItineraryTab = useSetItineraryTabFromUser();
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const { itinerary, detailCityId, detailExperienceId } = view;
  const activeTab = view.activeTab ?? 'overview';

  // Switching to Excursions with a city detail open silently collapses it —
  // this is tab-switch cleanup, not a user action on the itinerary, so it
  // sends no explore/close intent of its own.
  //
  // The intent below is edge-triggered here, on a real user tab change. It must
  // never move to an effect on `activeTab`: an agent-driven switch would echo
  // back, and every intent occupies one of the backend's three
  // conversation-history slots.
  const handleTabChange = useCallback(
    (tab: ItineraryTab) => {
      if (tab === activeTab) return;
      setItineraryTab(tab);
      if (tab === 'excursions' && detailCityId) {
        setViewFromUser({ type: 'itinerary', itinerary, activeTab: 'excursions' });
      }
      void sendIntent(tab === 'excursions' ? 'view_excursions' : 'view_itinerary', {
        userMessage:
          tab === 'excursions'
            ? 'User switched to the excursions tab'
            : 'User returned to the itinerary tab',
      });
    },
    [activeTab, detailCityId, itinerary, setItineraryTab, setViewFromUser, sendIntent]
  );

  return (
    <div className="absolute inset-0">
      <div
        className={cn('absolute inset-0', activeTab !== 'overview' && 'pointer-events-none')}
        inert={activeTab !== 'overview'}
      >
        <PanelMap view={view} interactive={activeTab === 'overview'} />
      </div>
      <div
        className={cn(
          'absolute inset-0',
          activeTab !== 'excursions' && 'pointer-events-none opacity-0'
        )}
        inert={activeTab !== 'excursions'}
      >
        <ExcursionsPanel itinerary={itinerary} detailExperienceId={detailExperienceId} />
      </div>
      <div className="absolute top-6 left-6 z-20">
        <ItineraryTabs value={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  );
}
```

Note the `setViewFromUser` call now carries `activeTab: 'excursions'`, because that action replaces the whole view — without it the tab set one line earlier would be discarded.

Update the imports: drop `useState`, add `useFrontendIntent` from `@/hooks/use-frontend-intent` and `useSetItineraryTabFromUser` from `@/lib/agent-ui/hooks`.

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm test`
Expected: both PASS. No unused imports may remain — `useState` is gone.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary/itinerary-panel.tsx components/panels/itinerary/itinerary-tabs.tsx
git commit -m "feat(itinerary): drive the tab from the store and report changes to the agent"
```

---

### Task 5: Accept the `source` field on the command envelope

**Files:**
- Modify: `lib/agent-ui/commands.ts` (the `Base` schema at :3-6)
- Test: `lib/agent-ui/commands.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `source?: string` on every parsed command.

The backend already computes the origin internally (`turn_handler.py:143`) but does not put it on the envelope (`domain/ui_commands/contract.py:6-13`). The contract asks them to propagate it. Accepting it now means the day they do, nothing breaks.

**It is optional and nothing renders differently.** Per the decision above, an agent-added excursion looks exactly like a user-added one. This task only prevents a future parse failure.

- [ ] **Step 1: Write the failing test**

Append to `lib/agent-ui/commands.test.ts`:

```ts
describe('command envelope source', () => {
  it('accepts a command carrying a source', () => {
    const result = UiCommand.parse({
      type: 'show_experience_detail',
      correlationId: 'c1',
      source: 'classifier',
      payload: { experience_id: 'exp-1' },
    });
    expect(result.source).toBe('classifier');
  });

  it('still accepts a command without a source', () => {
    const result = UiCommand.parse({
      type: 'show_experience_detail',
      correlationId: 'c1',
      payload: { experience_id: 'exp-1' },
    });
    expect(result.source).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test commands`
Expected: FAIL — `result.source` is `undefined` on the first test, because zod strips unknown keys.

- [ ] **Step 3: Extend the Base schema**

In `lib/agent-ui/commands.ts`:

```ts
const Base = z.object({
  correlationId: z.string(),
  sessionId: z.string().optional(),
  // Who originated the command: 'frontend-intent' when the user tapped,
  // 'classifier' when the agent decided on its own. The backend computes this
  // (turn_handler.py:143) but does not send it yet — accepted here so it parses
  // the day it does. Nothing renders differently on it today.
  source: z.string().optional(),
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: PASS, full suite.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(agent-ui): accept an optional source on the command envelope"
```

---

## What this plan deliberately does NOT do

- **No UI for removing an excursion.** The backend has no remove intent and re-sending `select_experience` with a new day appends rather than replaces (`_basket_helpers.py:65-73`). Building a remove button against an API that cannot remove would be worse than the current honest omission.
- **No fix for `add_experience_to_basket` or `soft_redirect`.** Whether the frontend adapts or the backend converges to snake_case is an open question in the contract document, awaiting the backend team's answer.
- **No visual treatment for agent-added excursions.** Decided: identical to user-added.

## Self-Review Notes

**Contract coverage.** Section 0 → Task 1. Action 1 (`view_excursions`) → Task 4. Actions 2 and 5 (`show_itinerary_tab`) → Task 2 for the wire, Task 4 for the UI. Action 3 → Task 3 (the frontend robustness half; the LLM entity-schema half is backend work). Action 4 → Task 5 (`source`); the voice-resolution half is backend work. Action 6 (`view_itinerary`) → Task 4, which now emits it on tab change as well as from `panel-map.tsx:59`.

**Type consistency.** `ItineraryTab` is defined once in `ui-view-types.ts` (Task 1) and re-exported by `itinerary-tabs.tsx` (Task 4). `activeTab` is optional everywhere and read as `view.activeTab ?? 'overview'`.

**Ordering risk.** Task 4 depends on Tasks 1-3 being merged; it is the only task that touches components, and it is last for that reason.
