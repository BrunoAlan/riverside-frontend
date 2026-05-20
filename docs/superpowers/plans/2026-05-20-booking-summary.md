# Booking Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, agent-driven booking summary panel anchored bottom-right of the app, visible on every view except `start`. Frontend renders pre-formatted snapshots; it does not derive any values.

**Architecture:** Extend the existing `uiViewStore` with a `bookingSummary` field updated by a new `set_booking_summary` UI command. Render a single `BookingSummaryContainer` as a sibling of `ViewController` in `components/layout/app.tsx`. Add dev-panel mocks so the visual look can be iterated without a live agent — components are not unit-tested in this repo (per `conventions/testing.md`), so the dev panel is the verification surface.

**Tech Stack:** TypeScript, Next.js 15 / React 19, Zustand, Zod 4, Tailwind v4, shadcn/ui (`Button`, `Badge`), `lucide-react` icons, Vitest (node env, `lib/**/*.test.ts` only).

**Reference design:** `docs/superpowers/specs/2026-05-20-booking-summary-design.md`. Visual targets: image #3 in the brainstorming session (bottom strip with two rows of chips and CTA).

---

## File Map

**Create:**

- `components/agent-ui/booking-summary.tsx` — pure `BookingSummary` component + `BookingSummaryContainer` wrapper that subscribes to the store.

**Modify:**

- `lib/agent-ui/commands.ts` — add `SetBookingSummary` command + exported `BookingSummarySnapshot` type.
- `lib/agent-ui/commands.test.ts` — add parser tests for the new command.
- `lib/agent-ui/ui-view-types.ts` — export `BookingSummary` type (internal camelCase shape).
- `lib/agent-ui/ui-view-store.ts` — add `bookingSummary` state, reducer case, `setBookingSummaryFromDev` setter.
- `lib/agent-ui/ui-view-store.test.ts` — cover new reducer case + orthogonality.
- `lib/agent-ui/hooks.ts` — add `useBookingSummary`, `useSetBookingSummaryFromDev` hooks.
- `lib/dev/mocks.ts` — add `BOOKING_SUMMARY_MOCKS`.
- `lib/dev/dev-panel.tsx` — add a section to pick a booking-summary mock.
- `components/layout/app.tsx` — mount `BookingSummaryContainer` alongside `ViewController`.

**No file deletions.**

---

## Task 1: Add `BookingSummarySnapshot` zod schema and `set_booking_summary` command

**Files:**

- Modify: `lib/agent-ui/commands.ts`
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/commands.test.ts`:

```ts
describe('set_booking_summary', () => {
  const validPayload = {
    people: { label: '2 People' },
    month: { label: 'March' },
    embarkation: { label: 'Budapest' },
    stops: { primary: 'Bratislava', extra: 3 },
    duration: { label: '5 days' },
    price: { label: 'from 2,368 pp.' },
    slots: [
      { label: 'Draft itinerary', state: 'active' as const },
      { label: 'Empty slot', state: 'empty' as const },
      { label: 'Empty slot', state: 'empty' as const },
    ],
    cta: { label: 'Continue to booking', enabled: true },
  };

  it('parses a fully populated snapshot', () => {
    const out = UiCommand.parse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: validPayload,
    });
    if (out.type !== 'set_booking_summary') throw new Error('discriminator failed');
    expect(out.payload.people).toEqual({ label: '2 People' });
    expect(out.payload.slots).toHaveLength(3);
    expect(out.payload.cta.enabled).toBe(true);
  });

  it('accepts null for all nullable fields', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: {
        ...validPayload,
        people: null,
        month: null,
        embarkation: null,
        stops: null,
        duration: null,
        price: null,
      },
    });
    expect(out.success).toBe(true);
  });

  it('accepts an empty slots array', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: { ...validPayload, slots: [] },
    });
    expect(out.success).toBe(true);
  });

  it('rejects more than 6 slots', () => {
    const tooMany = Array.from({ length: 7 }, () => ({ label: 'x', state: 'empty' as const }));
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: { ...validPayload, slots: tooMany },
    });
    expect(out.success).toBe(false);
  });

  it('rejects unknown slot state', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: {
        ...validPayload,
        slots: [{ label: 'x', state: 'pending' as unknown as 'active' }],
      },
    });
    expect(out.success).toBe(false);
  });

  it('rejects negative stops.extra', () => {
    const out = UiCommand.safeParse({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: { ...validPayload, stops: { primary: 'X', extra: -1 } },
    });
    expect(out.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test commands`
Expected: failures for the new `set_booking_summary` cases (`Invalid discriminator value` from Zod).

- [ ] **Step 3: Add the schema in `lib/agent-ui/commands.ts`**

Insert after the existing `ShowDreamStage` definition, before the `UiCommand` union:

```ts
export const BookingSummarySnapshot = z.object({
  people: z.object({ label: z.string() }).nullable(),
  month: z.object({ label: z.string() }).nullable(),
  embarkation: z.object({ label: z.string() }).nullable(),
  stops: z
    .object({ primary: z.string(), extra: z.number().int().min(0) })
    .nullable(),
  duration: z.object({ label: z.string() }).nullable(),
  price: z.object({ label: z.string() }).nullable(),
  slots: z
    .array(
      z.object({
        label: z.string(),
        state: z.enum(['active', 'filled', 'empty']),
      })
    )
    .max(6),
  cta: z.object({ label: z.string(), enabled: z.boolean() }),
});
export type BookingSummarySnapshot = z.infer<typeof BookingSummarySnapshot>;

const SetBookingSummary = Base.extend({
  type: z.literal('set_booking_summary'),
  payload: BookingSummarySnapshot,
});
```

Then add `SetBookingSummary` to the discriminated union:

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDreamStage,
  SetBookingSummary,
]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test commands`
Expected: all assertions pass, including the original suite.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(commands): add set_booking_summary UiCommand"
```

---

## Task 2: Add internal `BookingSummary` type

**Files:**

- Modify: `lib/agent-ui/ui-view-types.ts`

- [ ] **Step 1: Edit `lib/agent-ui/ui-view-types.ts`**

Replace the existing top of the file with:

```ts
import type { BookingSummarySnapshot, DreamImage, ItineraryOption } from './commands';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; images: DreamImage[] }
  | { type: 'itinerary' }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection' };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
```

The wire shape already uses plain field names, so `BookingSummary` is structurally identical to `BookingSummarySnapshot`. Re-exporting under a clean name keeps the camelCase / internal convention without inventing a second type.

- [ ] **Step 2: Run typecheck**

Run: `pnpm test` (Vitest also typechecks via tsc; if not, run `pnpm exec tsc --noEmit`).
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts
git commit -m "feat(types): export BookingSummary internal type"
```

---

## Task 3: Add `bookingSummary` to the store and reducer case

**Files:**

- Modify: `lib/agent-ui/ui-view-store.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/agent-ui/ui-view-store.test.ts`:

```ts
describe('booking summary', () => {
  const snapshot = {
    people: { label: '2 People' },
    month: { label: 'March' },
    embarkation: { label: 'Budapest' },
    stops: { primary: 'Bratislava', extra: 3 },
    duration: { label: '5 days' },
    price: { label: 'from 2,368 pp.' },
    slots: [
      { label: 'Draft itinerary', state: 'active' as const },
      { label: 'Empty slot', state: 'empty' as const },
      { label: 'Empty slot', state: 'empty' as const },
    ],
    cta: { label: 'Continue to booking', enabled: true },
  };

  it('initializes with bookingSummary null', () => {
    expect(store.getState().bookingSummary).toBeNull();
  });

  it('applyCommand(set_booking_summary) stores the snapshot and tags source agent', () => {
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    const s = store.getState();
    expect(s.bookingSummary).toEqual(snapshot);
    expect(s.source).toBe('agent');
    expect(s.lastCorrelationId).toBe('b1');
  });

  it('set_booking_summary does not change view or hint', () => {
    store.getState().applyCommand({ type: 'show_discovery_canvas', correlation_id: 'c1' });
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    const s = store.getState();
    expect(s.view).toEqual({ type: 'presentation' });
    expect(s.hint).toBeNull();
  });

  it('other commands do not clear bookingSummary', () => {
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    store.getState().applyCommand({ type: 'show_discovery_canvas', correlation_id: 'c2' });
    expect(store.getState().bookingSummary).toEqual(snapshot);
  });

  it('setViewFromDev does not clear bookingSummary', () => {
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    store.getState().setViewFromDev({ type: 'itinerary' });
    expect(store.getState().bookingSummary).toEqual(snapshot);
  });

  it('setViewFromUser does not clear bookingSummary', () => {
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    store.getState().setViewFromUser({ type: 'presentation' });
    expect(store.getState().bookingSummary).toEqual(snapshot);
  });

  it('setBookingSummaryFromDev(null) clears the summary and tags source dev', () => {
    store.getState().applyCommand({
      type: 'set_booking_summary',
      correlation_id: 'b1',
      payload: snapshot,
    });
    store.getState().setBookingSummaryFromDev(null);
    const s = store.getState();
    expect(s.bookingSummary).toBeNull();
    expect(s.source).toBe('dev');
  });

  it('setBookingSummaryFromDev(snapshot) sets the summary and tags source dev', () => {
    store.getState().setBookingSummaryFromDev(snapshot);
    const s = store.getState();
    expect(s.bookingSummary).toEqual(snapshot);
    expect(s.source).toBe('dev');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test ui-view-store`
Expected: failures — `bookingSummary` is undefined on the state, `setBookingSummaryFromDev` does not exist.

- [ ] **Step 3: Update `lib/agent-ui/ui-view-store.ts`**

Replace the file with:

```ts
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { UiCommand } from './commands';
import type { BookingSummary, UiHint, UiSource, UiView } from './ui-view-types';

interface UiViewState {
  view: UiView;
  hint: UiHint | null;
  source: UiSource;
  lastCorrelationId: string | null;
  lastError: { correlationId?: string; message: string } | null;
  bookingSummary: BookingSummary | null;

  applyCommand: (cmd: UiCommand) => void;
  setViewFromDev: (view: UiView) => void;
  setViewFromUser: (view: UiView) => void;
  setBookingSummaryFromDev: (summary: BookingSummary | null) => void;
  recordParseError: (err: { correlationId?: string; message: string }) => void;
}

const INITIAL_VIEW: UiView = { type: 'start' };

export function createUiViewStore() {
  return createStore<UiViewState>()((set) => ({
    view: INITIAL_VIEW,
    hint: null,
    source: 'initial',
    lastCorrelationId: null,
    lastError: null,
    bookingSummary: null,

    applyCommand: (cmd) =>
      set(() => {
        switch (cmd.type) {
          case 'show_discovery_canvas':
            return {
              view: { type: 'presentation' },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'show_itinerary_options':
            return {
              view: { type: 'compare_itinerary', options: cmd.payload.options },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'show_dream_stage':
            return {
              view: { type: 'dream_stage', images: cmd.payload.images },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'soft_redirect':
            return {
              hint: {
                type: 'soft_redirect',
                reasonCode: cmd.payload.reason_code,
                missing: cmd.payload.missing,
              },
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          case 'set_booking_summary':
            return {
              bookingSummary: cmd.payload,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
          default: {
            const _exhaustive: never = cmd;
            void _exhaustive;
            return {};
          }
        }
      }),

    setViewFromDev: (view) => set({ view, hint: null, source: 'dev', lastCorrelationId: null }),

    setViewFromUser: (view) => set({ view, hint: null, source: 'user', lastCorrelationId: null }),

    setBookingSummaryFromDev: (summary) =>
      set({ bookingSummary: summary, source: 'dev', lastCorrelationId: null }),

    recordParseError: (err) => set({ lastError: err }),
  }));
}

// Singleton used by the running app.
export const uiViewStore = createUiViewStore();

// React hook over the singleton.
export function useUiViewStore<T>(selector: (s: UiViewState) => T): T {
  return useStore(uiViewStore, selector);
}
```

Key points:

- New `bookingSummary` field initialized to `null`.
- `set_booking_summary` case returns ONLY the summary, source, and correlation id — it does not touch `view` or `hint`, which is what makes the summary orthogonal to navigation.
- Other reducer cases never include `bookingSummary` in their returned partial, so the field is preserved across view changes.
- `setViewFromDev` / `setViewFromUser` likewise leave `bookingSummary` untouched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts lib/agent-ui/ui-view-types.ts
git commit -m "feat(store): track bookingSummary and handle set_booking_summary"
```

---

## Task 4: Expose hooks for the summary

**Files:**

- Modify: `lib/agent-ui/hooks.ts`

- [ ] **Step 1: Edit `lib/agent-ui/hooks.ts`**

Append:

```ts
export const useBookingSummary = () => useUiViewStore((s) => s.bookingSummary);
export const useSetBookingSummaryFromDev = () =>
  useUiViewStore((s) => s.setBookingSummaryFromDev);
```

- [ ] **Step 2: Sanity-check the file**

Run: `pnpm test` (typecheck via tsc surfaces missing exports).
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/hooks.ts
git commit -m "feat(hooks): expose useBookingSummary and dev setter"
```

---

## Task 5: Build the `BookingSummary` component and container

**Files:**

- Create: `components/agent-ui/booking-summary.tsx`

- [ ] **Step 1: Create the file with the pure component + container**

```tsx
'use client';

import {
  BookOpen,
  CalendarDays,
  Clock,
  Euro,
  Maximize2,
  MapPin,
  Save,
  Share,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookingSummary, useUiView } from '@/lib/agent-ui/hooks';
import type { BookingSummary as BookingSummaryType } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/utils';

interface BookingSummaryProps {
  summary: BookingSummaryType;
}

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  muted?: boolean;
}

function Chip({ icon, label, muted = false }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        muted ? 'text-muted-foreground' : 'text-foreground'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </span>
  );
}

interface SlotProps {
  label: string;
  state: 'active' | 'filled' | 'empty';
}

function Slot({ label, state }: SlotProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs',
        state === 'active' && 'bg-muted text-foreground underline underline-offset-2',
        state === 'filled' && 'bg-muted text-foreground',
        state === 'empty' && 'border border-dashed border-muted-foreground/40 text-muted-foreground'
      )}
    >
      {label}
    </span>
  );
}

export function BookingSummary({ summary }: BookingSummaryProps) {
  const stopsLabel = summary.stops
    ? summary.stops.extra > 0
      ? `${summary.stops.primary} +${summary.stops.extra}`
      : summary.stops.primary
    : null;

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-lg backdrop-blur',
        'flex w-fit min-w-[640px] max-w-[1100px] flex-col gap-2'
      )}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Chip icon={<Users className="size-4" />} label={summary.people?.label ?? 'People'} muted={!summary.people} />
          <Chip icon={<CalendarDays className="size-4" />} label={summary.month?.label ?? 'Month'} muted={!summary.month} />
          <Chip icon={<MapPin className="size-4" />} label={summary.embarkation?.label ?? 'Embark'} muted={!summary.embarkation} />
          <Chip icon={<BookOpen className="size-4" />} label={stopsLabel ?? 'Stops'} muted={!stopsLabel} />
          <Chip icon={<Clock className="size-4" />} label={summary.duration?.label ?? 'Days'} muted={!summary.duration} />
          <Chip icon={<Euro className="size-4" />} label={summary.price?.label ?? 'Price'} muted={!summary.price} />
        </div>

        <Button variant="secondary" size="sm" className="gap-2">
          <Maximize2 className="size-3.5" />
          Itinerary Summary
        </Button>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {summary.slots.map((slot, i) => (
            <Slot key={`${slot.label}-${i}`} label={slot.label} state={slot.state} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Share">
            <Share className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Save">
            <Save className="size-4" />
          </Button>
          <Button disabled={!summary.cta.enabled}>{summary.cta.label}</Button>
        </div>
      </div>
    </div>
  );
}

export function BookingSummaryContainer() {
  const view = useUiView();
  const summary = useBookingSummary();

  if (view.type === 'start') return null;
  if (summary === null) return null;

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-40 flex justify-end">
      <BookingSummary summary={summary} />
    </div>
  );
}
```

Notes for the implementer:

- All click handlers are intentionally omitted (per spec scope).
- The CTA uses shadcn `<Button>` so `disabled` styling is correct out of the box.
- Positioning: `fixed bottom-6 right-6 z-40`. The dev panel uses `bottom-3 right-3 z-[100]` — we sit below it visually and at lower z so the dev panel always wins.
- Outer wrapper is `pointer-events-none` so the page background remains hit-testable; the card itself opts back in with `pointer-events-auto`.
- Compare against Figma: the chip row should look like the second screenshot in image #3. If a label rendered by lucide doesn't match the mockup glyph exactly (e.g. the "stops" book icon), swap to the closest `lucide-react` icon — don't introduce a new icon library.

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/agent-ui/booking-summary.tsx
git commit -m "feat(agent-ui): add BookingSummary component and container"
```

---

## Task 6: Add booking summary mocks for the dev panel

**Files:**

- Modify: `lib/dev/mocks.ts`

- [ ] **Step 1: Append mocks to `lib/dev/mocks.ts`**

Add the new import next to the existing import at the top of the file:

```ts
import type { BookingSummary, UiView } from '@/lib/agent-ui/ui-view-types';
```

Then append the rest at the bottom of the file:

```ts
export interface BookingSummaryMock {
  id: string;
  label: string;
  summary: BookingSummary | null;
}

export const BOOKING_SUMMARY_MOCKS: readonly BookingSummaryMock[] = [
  {
    id: 'clear',
    label: 'Hidden (null)',
    summary: null,
  },
  {
    id: 'empty',
    label: 'All placeholders',
    summary: {
      people: null,
      month: null,
      embarkation: null,
      stops: null,
      duration: null,
      price: null,
      slots: [],
      cta: { label: 'Continue to booking', enabled: false },
    },
  },
  {
    id: 'partial',
    label: 'Partial (people/month/port)',
    summary: {
      people: { label: '2 People' },
      month: { label: 'March' },
      embarkation: { label: 'Budapest' },
      stops: null,
      duration: null,
      price: null,
      slots: [{ label: 'Draft itinerary', state: 'active' }],
      cta: { label: 'Continue to booking', enabled: false },
    },
  },
  {
    id: 'full',
    label: 'Full (matches Figma)',
    summary: {
      people: { label: '2 People' },
      month: { label: 'March' },
      embarkation: { label: 'Budapest' },
      stops: { primary: 'Bratislava', extra: 3 },
      duration: { label: '5 days' },
      price: { label: 'from 2,368 pp.' },
      slots: [
        { label: 'Draft itinerary', state: 'active' },
        { label: 'Empty slot', state: 'empty' },
        { label: 'Empty slot', state: 'empty' },
      ],
      cta: { label: 'Continue to booking', enabled: true },
    },
  },
];
```

The `full` mock is the visual reference for matching the Figma — keep it in sync with the Figma when the design changes.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "feat(dev): add booking summary mocks"
```

---

## Task 7: Wire mocks into the dev panel

**Files:**

- Modify: `lib/dev/dev-panel.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  useSetBookingSummaryFromDev,
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { BOOKING_SUMMARY_MOCKS, VIEW_MOCKS } from './mocks';

const VIEW_TYPES = Object.keys(VIEW_MOCKS) as UiView['type'][];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const view = useUiView();
  const source = useUiSource();
  const lastError = useUiLastError();
  const setViewFromDev = useSetViewFromDev();
  const setBookingSummaryFromDev = useSetBookingSummaryFromDev();

  const [type, setType] = useState<UiView['type']>(view.type);
  const mocks = VIEW_MOCKS[type];
  const [mockId, setMockId] = useState(mocks[0]?.id ?? '');

  const [summaryMockId, setSummaryMockId] = useState(BOOKING_SUMMARY_MOCKS[0]?.id ?? '');

  useEffect(() => {
    setType(view.type);
    setMockId(VIEW_MOCKS[view.type][0]?.id ?? '');
  }, [view.type]);

  const applyView = () => {
    const chosen = mocks.find((m) => m.id === mockId) ?? mocks[0];
    if (chosen) setViewFromDev(chosen.view);
  };

  const applySummary = () => {
    const chosen =
      BOOKING_SUMMARY_MOCKS.find((m) => m.id === summaryMockId) ?? BOOKING_SUMMARY_MOCKS[0];
    if (chosen) setBookingSummaryFromDev(chosen.summary);
  };

  return (
    <div className="fixed right-3 bottom-3 z-[100] font-mono text-xs">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-black/80 px-2 py-1 text-white"
        >
          dev
        </button>
      )}
      {open && (
        <div className="w-72 space-y-2 rounded-md bg-black/80 p-3 text-white">
          <div className="flex items-center justify-between">
            <span>UI dev panel</span>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
          <div>
            current: <b>{view.type}</b> (source: {source})
          </div>
          <label className="block">
            view
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as UiView['type'];
                setType(nextType);
                setMockId(VIEW_MOCKS[nextType][0]?.id ?? '');
              }}
            >
              {VIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={mockId}
              onChange={(e) => setMockId(e.target.value)}
            >
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={applyView} className="flex-1 rounded bg-white text-black">
              Apply view
            </button>
            <button
              type="button"
              onClick={() => setViewFromDev({ type: 'start' })}
              className="rounded bg-white/20 px-2 text-white"
            >
              Reset
            </button>
          </div>

          <div className="mt-2 border-t border-white/20 pt-2">booking summary</div>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={summaryMockId}
              onChange={(e) => setSummaryMockId(e.target.value)}
            >
              {BOOKING_SUMMARY_MOCKS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applySummary}
            className="w-full rounded bg-white text-black"
          >
            Apply summary
          </button>

          {lastError && (
            <div className="rounded bg-red-900/60 p-1">last error: {lastError.message}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/dev/dev-panel.tsx
git commit -m "feat(dev): add booking summary mock picker to dev panel"
```

---

## Task 8: Mount the container in the app shell

**Files:**

- Modify: `components/layout/app.tsx`

- [ ] **Step 1: Edit `components/layout/app.tsx`**

Add the import and render `BookingSummaryContainer` as a sibling of `ViewController`. The new file body around the JSX should look like:

```tsx
import { BookingSummaryContainer } from '@/components/agent-ui/booking-summary';
// ... other existing imports unchanged ...

  return (
    <AppConfigProvider config={appConfig}>
      <AgentSessionProvider session={session}>
        <AppSetup />
        <div className="grid h-full grid-cols-1 grid-rows-1">
          <ViewController />
        </div>
        <BookingSummaryContainer />
        <StartAudioButton label="Start Audio" />
        {IN_DEVELOPMENT && <DevPanel />}
      </AgentSessionProvider>
    </AppConfigProvider>
  );
```

`BookingSummaryContainer` is placed *after* `<ViewController />` and *before* `<DevPanel />` so the dev panel still paints on top (it uses `z-[100]`, the summary uses `z-40`).

- [ ] **Step 2: Run the dev server and verify the look**

Run: `pnpm dev`

Then open the app in a browser, open the dev panel, and:

1. Confirm: on the default `start` view, the summary is **not** visible.
2. Use "Apply view" → `presentation` (or any other view).
3. Use the new "booking summary → Apply summary" with mock `full`. Confirm the summary appears bottom-right and visually matches the Figma reference (image #3 in spec): two rows, chips top, slots + CTA bottom, rounded card, subtle shadow.
4. Cycle through mocks: `empty` shows all placeholder chips, dashed-empty look; `partial` shows mixed states; `clear` hides the summary entirely.
5. Switch the view back to `start` — the summary disappears even though the snapshot is still in the store.
6. Switch the view away from `start` again — it re-appears.

If the visual differs from Figma in non-trivial ways (spacing, chip radius, icon mismatch), tweak class names in `booking-summary.tsx` and re-verify. Commit those tweaks as a follow-up commit before Task 9.

- [ ] **Step 3: Commit**

```bash
git add components/layout/app.tsx
git commit -m "feat(layout): mount BookingSummaryContainer alongside ViewController"
```

---

## Task 9: Final sweep — tests, lint, format

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests green, including original suites and the new ones from Tasks 1 and 3.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Run formatter check**

Run: `pnpm format:check`
Expected: clean. If not, run `pnpm format` and commit the format-only result with `chore: format`.

- [ ] **Step 4: Optional final commit if formatter changed anything**

```bash
git add -A
git commit -m "chore: format"
```

---

## Notes and risks

- **No React component tests.** Per `conventions/testing.md`, components are verified visually via the dev panel. The four mocks in Task 6 are the verification surface — keep `full` in sync with Figma.
- **Wire spec.** Once this lands, communicate the new `set_booking_summary` payload shape to the backend team (Pydantic / agent-side). The `lib/agent-ui/commands.ts` Zod schema is the source of truth.
- **CTA actions are intentionally no-op.** Wiring will come in a follow-up ticket; do not add `onClick` handlers now even if they feel obvious.
- **Z-index discipline.** `BookingSummaryContainer` = `z-40`, `DevPanel` = `z-[100]`, `StartAudioButton` is whatever its own component uses — if it overlaps the summary visually, file a follow-up rather than re-shuffling z-indices in this ticket.
