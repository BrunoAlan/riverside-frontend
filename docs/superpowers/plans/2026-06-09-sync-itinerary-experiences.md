# sync_itinerary_experiences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire an inbound `sync_itinerary_experiences` command that merges already-added experiences into the store, and make the "Added" state visible on experience cards at all times (collapsed and expanded).

**Architecture:** New Zod command in `commands.ts` → handled in the `applyCommand` reducer in `ui-view-store.ts` by merging into the existing `addedExperiences` array (dedup by `experienceId+day`, never removes). `ExperienceCard` already receives `addedDays`; we add a header badge + subtle accent driven by `addedDays.length > 0`.

**Tech Stack:** TypeScript, Zod, Zustand, React, Vitest, Tailwind, shadcn, Phosphor icons.

**Reference spec:** `docs/superpowers/specs/2026-06-09-sync-itinerary-experiences-design.md`

**Commands:** `pnpm test <path>` runs a test file; `pnpm lint` lints. Use `pnpm`, never npm/yarn.

---

### Task 1: Schema for `sync_itinerary_experiences`

**Files:**
- Modify: `lib/agent-ui/commands.ts` (add command near `AddExperienceToBasket` ~line 168, and into the `UiCommand` union ~line 177)
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/agent-ui/commands.test.ts`, inside the `describe('UiCommand schema', ...)` block:

```ts
it('parses sync_itinerary_experiences with a list of experiences', () => {
  const result = UiCommand.parse({
    type: 'sync_itinerary_experiences',
    correlationId: '33154a65-61ab-4519-989d-ca9e2c07336a',
    payload: {
      experiences: [
        {
          experience_id: 'signature_vienna_belvedere_palace',
          name: 'Signature Vienna: VIP Evening at Belvedere Palace',
          day: 'Day 5',
          destination: '',
          passenger_count: 2,
        },
      ],
    },
  });
  if (result.type !== 'sync_itinerary_experiences') throw new Error('discriminator failed');
  expect(result.payload.experiences).toHaveLength(1);
  expect(result.payload.experiences[0].experience_id).toBe('signature_vienna_belvedere_palace');
  expect(result.payload.experiences[0].day).toBe('Day 5');
});

it('rejects sync_itinerary_experiences with a non-numeric passenger_count', () => {
  const parsed = UiCommand.safeParse({
    type: 'sync_itinerary_experiences',
    correlationId: 'c1',
    payload: {
      experiences: [
        {
          experience_id: 'x',
          name: 'X',
          day: 'Day 1',
          destination: '',
          passenger_count: 'two',
        },
      ],
    },
  });
  expect(parsed.success).toBe(false);
});

it('rejects sync_itinerary_experiences when experiences is not an array', () => {
  const parsed = UiCommand.safeParse({
    type: 'sync_itinerary_experiences',
    correlationId: 'c1',
    payload: { experiences: 'nope' },
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: FAIL — the three new tests fail (parse throws / safeParse `success` is `true` because the unknown `type` is not in the union yet).

- [ ] **Step 3: Add the schema and union entry**

In `lib/agent-ui/commands.ts`, after the `AddExperienceToBasket` definition (~line 175):

```ts
const SyncItineraryExperiences = Base.extend({
  type: z.literal('sync_itinerary_experiences'),
  payload: z.object({
    experiences: z.array(
      z.object({
        experience_id: z.string(),
        name: z.string(),
        day: z.string(),
        destination: z.string(),
        passenger_count: z.number().int(),
      })
    ),
  }),
});
```

Then add it to the `UiCommand` discriminated union (after `AddExperienceToBasket`):

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDestinationDetail,
  SetBookingSummary,
  ShowCabinOptions,
  ShowCabinDetail,
  ShowCityDetail,
  ShowExperienceDetail,
  AddCabinToBasket,
  AddExperienceToBasket,
  SyncItineraryExperiences,
]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test lib/agent-ui/commands.test.ts`
Expected: PASS (all tests, including the three new ones).

Note: the build will now fail typecheck in `ui-view-store.ts` because the reducer's `_exhaustive: never` no longer holds. That is fixed in Task 2 — do not commit a broken typecheck. Proceed to Task 2 before committing, or commit after Task 2.

- [ ] **Step 5: Commit (after Task 2 typecheck passes)**

Deferred — committed together with Task 2 since the union change breaks the reducer's exhaustiveness check.

---

### Task 2: Reducer merges into `addedExperiences`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts` (add a `case` in `applyCommand`, after the `add_experience_to_basket` case ~line 147)
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/agent-ui/ui-view-store.test.ts`, after the `add_experience_to_basket` tests (~line 530, still inside the top-level `describe('ui-view-store', ...)`):

```ts
it('applyCommand(sync_itinerary_experiences) merges new entries', () => {
  store.getState().applyCommand({
    type: 'sync_itinerary_experiences',
    correlationId: 'c-sync-1',
    payload: {
      experiences: [
        {
          experience_id: 'belvedere',
          name: 'Belvedere',
          day: 'Day 5',
          destination: '',
          passenger_count: 2,
        },
      ],
    },
  });
  expect(store.getState().addedExperiences).toEqual([
    { experienceId: 'belvedere', day: 'Day 5' },
  ]);
  expect(store.getState().lastCorrelationId).toBe('c-sync-1');
});

it('applyCommand(sync_itinerary_experiences) dedups against existing entries', () => {
  store.getState().applyCommand({
    type: 'add_experience_to_basket',
    correlationId: 'c-add',
    payload: { experience_id: 'belvedere', day: 'Day 5', passenger_count: 2 },
  });
  store.getState().applyCommand({
    type: 'sync_itinerary_experiences',
    correlationId: 'c-sync-2',
    payload: {
      experiences: [
        { experience_id: 'belvedere', day: 'Day 5', name: 'B', destination: '', passenger_count: 2 },
        { experience_id: 'schonbrunn', day: 'Day 6', name: 'S', destination: '', passenger_count: 2 },
      ],
    },
  });
  expect(store.getState().addedExperiences).toEqual([
    { experienceId: 'belvedere', day: 'Day 5' },
    { experienceId: 'schonbrunn', day: 'Day 6' },
  ]);
});

it('applyCommand(sync_itinerary_experiences) does not remove entries absent from the payload', () => {
  store.getState().applyCommand({
    type: 'add_experience_to_basket',
    correlationId: 'c-add',
    payload: { experience_id: 'keepme', day: 'Day 1', passenger_count: 2 },
  });
  store.getState().applyCommand({
    type: 'sync_itinerary_experiences',
    correlationId: 'c-sync-3',
    payload: {
      experiences: [
        { experience_id: 'other', day: 'Day 2', name: 'O', destination: '', passenger_count: 2 },
      ],
    },
  });
  expect(store.getState().addedExperiences).toEqual([
    { experienceId: 'keepme', day: 'Day 1' },
    { experienceId: 'other', day: 'Day 2' },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`
Expected: FAIL — reducer has no `sync_itinerary_experiences` case (hits `default`, returns `{}`, so `addedExperiences` stays `[]` / `lastCorrelationId` unchanged).

- [ ] **Step 3: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, after the `add_experience_to_basket` case (~line 147, before `default:`):

```ts
case 'sync_itinerary_experiences': {
  const next = [...state.addedExperiences];
  for (const e of cmd.payload.experiences) {
    const exists = next.some(
      (a) => a.experienceId === e.experience_id && a.day === e.day
    );
    if (!exists) next.push({ experienceId: e.experience_id, day: e.day });
  }
  return {
    addedExperiences: next,
    source: 'agent',
    lastCorrelationId: cmd.correlationId,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`
Expected: PASS (all tests including the three new ones).

- [ ] **Step 5: Lint and commit Tasks 1 + 2 together**

Run: `pnpm lint`
Expected: clean (no errors).

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): handle sync_itinerary_experiences (merge into addedExperiences)"
```

---

### Task 3: Visible "Added" badge + accent on the experience card

**Files:**
- Modify: `components/panels/map/experience-card.tsx`

There is no component test harness for this card today; it is verified via lint + typecheck and visual review. We keep the change minimal and driven by the already-supplied `addedDays` prop, so no new plumbing is needed.

- [ ] **Step 1: Split the "added" booleans**

In `components/panels/map/experience-card.tsx`, replace the single `isAdded` line (currently line 39):

```ts
const isAdded = addedDays.includes(selectedDay);
```

with two derived values — one for the card-level state (any day added), one for the Confirm button (the selected day specifically):

```ts
const isAdded = addedDays.length > 0;
const isSelectedDayAdded = addedDays.includes(selectedDay);
```

- [ ] **Step 2: Use `isSelectedDayAdded` for the Confirm button**

In the same file, update the Confirm `Button` (currently uses `isAdded` for `disabled` and label, ~lines 99 and 102) to use `isSelectedDayAdded`:

```tsx
<Button
  type="button"
  variant="secondary"
  size="sm"
  disabled={isSelectedDayAdded || !selectedDay}
  onClick={() => onConfirm(selectedDay)}
>
  {isSelectedDayAdded ? (
    <>
      <CheckIcon weight="bold" /> Added
    </>
  ) : (
    'Confirm'
  )}
</Button>
```

- [ ] **Step 3: Add the accent on the card when added**

Update the root `Card` `className` (currently line 44) to apply a subtle accent when `isAdded`, using `cn` (already imported):

```tsx
<Card
  ref={cardRef}
  className={cn(
    'bg-beige-50 border-beige-400/50 flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none',
    isAdded && 'border-primary/40 bg-primary/5'
  )}
>
```

- [ ] **Step 4: Add the header badge**

In the header row, after the experience name `div` (currently line 49) and before the toggle `Button`, the name+badge should sit together on the left. Wrap the name and badge in a flex container so the badge sits beside the name. Replace the name `div` (line 49) with:

```tsx
<div className="flex min-w-0 grow flex-wrap items-center gap-2">
  <span className="text-primary text-base leading-snug font-medium">{experience.name}</span>
  {isAdded && (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
      <CheckIcon weight="bold" /> Added · {addedDays.join(', ')}
    </span>
  )}
</div>
```

(The surrounding `<div className="flex grow items-center justify-between gap-2">` and the toggle `Button` stay as-is. `CheckIcon` is already imported.)

- [ ] **Step 5: Lint and typecheck**

Run: `pnpm lint`
Expected: clean (no errors).

- [ ] **Step 6: Commit**

```bash
git add components/panels/map/experience-card.tsx
git commit -m "feat(panels): show persistent Added badge + accent on experience cards"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS (no regressions).

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Confirm clean tree**

Run: `git status`
Expected: working tree clean on `feat/sync-itinerary-experiences`.

---

## Notes / out of scope

- No dev mock entry: `lib/dev/mocks.ts` holds **view** mocks (`VIEW_MOCKS`), not command-dispatch fixtures — there is no in-app mechanism that injects raw commands, so a mock there would be unused (YAGNI). The schema test fixtures document the wire contract instead.
- No removal flow, no localStorage persistence, no persisting `name`/`destination`/`passenger_count` — all per the spec's "Out of scope".
- The "Reject" button stays unwired/untouched.
