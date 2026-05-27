# `show_destination_detail` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `show_dream_stage` → `show_destination_detail` and reshape the command/view/mocks/panel to match the real backend wire format (destination + `{ url, caption }` images), keeping the rendered view `dream_stage` unchanged.

**Architecture:** Pure rename + reshape across the agent-UI pipeline. Zod schema → store reducer → view type → panel component → dev mocks → tests. No new wiring; `transport.ts` is untouched (the rewire of `applyCommand` is intentionally out of scope and tracked elsewhere). The exhaustive `never` check in the reducer guarantees the rename can't be half-done — TypeScript fails the build until every link is updated.

**Tech Stack:** TypeScript, Zod, Zustand, Vitest, Next.js (App Router), pnpm.

**Spec:** `docs/superpowers/specs/2026-05-27-show-destination-detail-design.md`

**Branch:** `feat/show-destination-detail-command` (already created and currently checked out)

---

## File Structure

The change spans the existing agent-UI files; no new files are introduced.

- **Modify** `lib/agent-ui/commands.ts` — replace `DreamImage` / `ShowDreamStage` with `Destination` / `DestinationImage` / `ShowDestinationDetail`; swap into the `UiCommand` union.
- **Modify** `lib/agent-ui/ui-view-types.ts` — `dream_stage` view variant now carries `destination` + `DestinationImage[]`.
- **Modify** `lib/agent-ui/ui-view-store.ts` — reducer case renamed and reshaped.
- **Modify** `components/panels/dream/panel-dream.tsx` — type as `DestinationImage[]`, read `url`/`caption`.
- **Modify** `lib/dev/mocks.ts` — replace both `dream_stage` mocks with the new shape (Vienna sample from the live payload).

`components/agent-ui/views/dream-stage-view.tsx` does not need to change: it already passes `view.images` straight through to `PanelDream`, and the new view type (Task 2) lines up with the new prop type (Task 4) via inference.
- **Modify** `lib/agent-ui/commands.test.ts` — rename + reshape the dream-stage cases; add bounds tests.
- **Modify** `lib/agent-ui/ui-view-store.test.ts` — rename + reshape the dream-stage reducer test; update the `setViewFromDev` fixture.

No conventions file references `show_dream_stage` by name, so `conventions/*` does not need to change. Historical dated docs under `docs/superpowers/{specs,plans}/` and `docs/2026-05-{26,27}-*` are snapshots and remain untouched.

---

### Task 1: Replace the schema in `commands.ts`

**Files:**
- Modify: `lib/agent-ui/commands.ts`

- [ ] **Step 1: Update the schema**

Replace the existing `DreamImage` export and the `ShowDreamStage` block, then swap the union entry. The final state of the relevant section:

```ts
export const Destination = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  region: z.string(),
  aliases: z.array(z.string()),
});
export type Destination = z.infer<typeof Destination>;

export const DestinationImage = z.object({
  url: z.string().url(),
  caption: z.string(),
});
export type DestinationImage = z.infer<typeof DestinationImage>;

const ShowDestinationDetail = Base.extend({
  type: z.literal('show_destination_detail'),
  payload: z.object({
    destination: Destination,
    images: z.array(DestinationImage).min(1),
  }),
});
```

And the union:

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDestinationDetail,
  SetBookingSummary,
  SetCabinDetail,
]);
export type UiCommand = z.infer<typeof UiCommand>;
```

Make sure the file no longer references `DreamImage` or `ShowDreamStage` anywhere.

- [ ] **Step 2: Verify type errors point at the next step**

Run: `pnpm tsc --noEmit`

Expected: failures in `lib/agent-ui/ui-view-types.ts`, `lib/agent-ui/ui-view-store.ts`, `components/panels/dream/panel-dream.tsx`, `lib/dev/mocks.ts`, and the two test files. These are intentional — the next tasks fix them in order. Do not commit yet.

---

### Task 2: Update the view-types union

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`

- [ ] **Step 1: Update imports and the `dream_stage` variant**

Replace the file's contents with:

```ts
import type {
  BookingSummarySnapshot,
  Destination,
  DestinationImage,
  ItineraryOption,
} from './commands';

export type AddOnDecision = 'confirmed' | 'rejected';

export type UiView =
  | { type: 'start' }
  | { type: 'presentation' }
  | { type: 'dream_stage'; destination: Destination; images: DestinationImage[] }
  | { type: 'itinerary'; addOnDecisions: Record<string, AddOnDecision> }
  | { type: 'compare_itinerary'; options: ItineraryOption[] }
  | { type: 'cabin_selection'; detailCabinId?: string };

export type UiHint = { type: 'soft_redirect'; reasonCode: string; missing?: string[] };

export type UiSource = 'initial' | 'agent' | 'dev' | 'user';

export type BookingSummary = BookingSummarySnapshot;
```

Note: `DreamImage` is gone from the import list.

- [ ] **Step 2: Confirm the build still fails downstream only**

Run: `pnpm tsc --noEmit`

Expected: errors now only in `ui-view-store.ts`, `panel-dream.tsx`, `mocks.ts`, and the two tests. The two files touched so far (`commands.ts`, `ui-view-types.ts`) should be clean.

---

### Task 3: Update the reducer

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`

- [ ] **Step 1: Rename and reshape the reducer case**

Replace the existing `case 'show_dream_stage':` block with:

```ts
case 'show_destination_detail':
  return {
    view: {
      type: 'dream_stage',
      destination: cmd.payload.destination,
      images: cmd.payload.images,
    },
    hint: null,
    source: 'agent',
    lastCorrelationId: cmd.correlation_id,
  };
```

Leave every other case (`show_discovery_canvas`, `show_itinerary_options`, `soft_redirect`, `set_booking_summary`, `set_cabin_detail`) and the `_exhaustive: never` default block exactly as they are.

- [ ] **Step 2: Confirm the file type-checks**

Run: `pnpm tsc --noEmit`

Expected: errors in `panel-dream.tsx`, `mocks.ts`, and the two tests only. `ui-view-store.ts` is clean.

---

### Task 4: Update `PanelDream` to the new image shape

**Files:**
- Modify: `components/panels/dream/panel-dream.tsx`

- [ ] **Step 1: Update the import**

Change:

```ts
import type { DreamImage } from '@/lib/agent-ui/commands';
```

to:

```ts
import type { DestinationImage } from '@/lib/agent-ui/commands';
```

- [ ] **Step 2: Update the prop type and per-image references**

Change the props interface and `DreamMask` signature to use `DestinationImage`, and swap field accesses. Concretely, every `DreamImage` becomes `DestinationImage`, every `image.src` becomes `image.url`, every `image.tag` becomes `image.caption`. The three call sites are:

```tsx
interface PanelDreamProps {
  images: DestinationImage[];
}

function DreamMask({ image, index }: { image: DestinationImage; index: number }) {
  // ...
  <Image
    src={image.url}
    alt={image.caption}
    fill
    priority={index === 0}
    sizes="(max-width: 768px) 85vw, 35vw"
    className="scale-[1.04] object-cover"
  />
  // ...
}
```

And the floating tag plus the `key`:

```tsx
<div
  key={`${index}-${image.url}`}
  // ...
>
  {/* ... */}
  <span className="bg-beige-900/60 absolute bottom-[20%] left-[20%] z-20 rounded-full px-4 py-2 text-xs text-white backdrop-blur-md">
    {image.caption}
  </span>
</div>
```

Leave layout, animation, slot math, and styling untouched.

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`

Expected: errors only in `mocks.ts` and the two test files.

---

### Task 5: Update the dev mocks

**Files:**
- Modify: `lib/dev/mocks.ts`

- [ ] **Step 1: Replace the `dream_stage` mocks**

Replace the existing `dream_stage:` array under `VIEW_MOCKS` with two mocks using the real shape. The destination block matches the live Vienna payload from the spec.

```ts
  dream_stage: [
    {
      id: 'default',
      label: 'Vienna detail (4 images)',
      view: {
        type: 'dream_stage',
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: ['City of Music'],
        },
        images: [
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_01.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_02.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_03.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_007_image_01.jpg',
            caption: 'FOCUS',
          },
        ],
      },
    },
    {
      id: 'partial',
      label: 'Vienna detail (2 images)',
      view: {
        type: 'dream_stage',
        destination: {
          id: 'vienna',
          name: 'Vienna',
          country: 'Austria',
          region: 'Danube',
          aliases: ['City of Music'],
        },
        images: [
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_01.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
          {
            url: 'https://res.cloudinary.com/dxcabwnx7/image/upload/funnel/riverside_mozart_mvp/page_005_image_02.jpg',
            caption: 'SIGNATURE VIENNA: VIP EVENING AT',
          },
        ],
      },
    },
  ],
```

Leave every other entry (`start`, `presentation`, `itinerary`, `compare_itinerary`, `cabin_selection`) and the `BOOKING_SUMMARY_MOCKS` block exactly as they are.

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`

Expected: errors only in the two test files now.

---

### Task 6: Update `commands.test.ts`

**Files:**
- Modify: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Replace the three dream-stage test cases**

Remove these three existing cases:

- `parses show_dream_stage with 1-5 images`
- `rejects show_dream_stage with non-url src`
- `rejects show_dream_stage with more than 5 images`

Insert the four new cases below in the same describe block (after `parses show_itinerary_options with one option`):

```ts
it('parses show_destination_detail with destination and images', () => {
  const result = UiCommand.parse({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: ['City of Music'],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
          caption: 'Vienna at dusk',
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
          caption: 'Riverside terrace',
        },
      ],
    },
  });
  if (result.type !== 'show_destination_detail') throw new Error('discriminator failed');
  expect(result.payload.destination.name).toBe('Vienna');
  expect(result.payload.destination.aliases).toEqual(['City of Music']);
  expect(result.payload.images).toHaveLength(2);
  expect(result.payload.images[0].url).toMatch(/^https:\/\//);
});

it('rejects show_destination_detail with non-url image url', () => {
  const out = UiCommand.safeParse({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: [],
      },
      images: [{ url: '/dream/1.jpg', caption: 'Vienna' }],
    },
  });
  expect(out.success).toBe(false);
});

it('rejects show_destination_detail with empty images array', () => {
  const out = UiCommand.safeParse({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: [],
      },
      images: [],
    },
  });
  expect(out.success).toBe(false);
});

it('accepts show_destination_detail with more than 5 images', () => {
  const out = UiCommand.safeParse({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: [],
      },
      images: Array.from({ length: 7 }, (_, i) => ({
        url: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
        caption: String(i),
      })),
    },
  });
  expect(out.success).toBe(true);
});

it('rejects show_destination_detail with missing destination fields', () => {
  const out = UiCommand.safeParse({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        // country missing
        region: 'Danube',
        aliases: [],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
          caption: 'Vienna',
        },
      ],
    },
  });
  expect(out.success).toBe(false);
});
```

Leave every other test in this file (`set_booking_summary`, `set_cabin_detail`, the `show_discovery_canvas`, `soft_redirect`, `show_itinerary_options`, `rejects unknown command type`, `rejects missing correlation_id`) exactly as they are.

- [ ] **Step 2: Run the file**

Run: `pnpm test lib/agent-ui/commands.test.ts`

Expected: all tests pass, including the five new dream-stage cases.

---

### Task 7: Update `ui-view-store.test.ts`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Replace the dream-stage reducer test**

Remove the existing case:

```ts
it('applyCommand(show_dream_stage) maps payload images into view', () => {
  // ...
});
```

Insert in its place:

```ts
it('applyCommand(show_destination_detail) maps destination and images into view', () => {
  store.getState().applyCommand({
    type: 'show_destination_detail',
    correlation_id: 'd1',
    payload: {
      destination: {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        region: 'Danube',
        aliases: ['City of Music'],
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
          caption: 'Vienna at dusk',
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
          caption: 'Riverside terrace',
        },
      ],
    },
  });
  const s = store.getState();
  expect(s.view).toEqual({
    type: 'dream_stage',
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: ['City of Music'],
    },
    images: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        caption: 'Vienna at dusk',
      },
      {
        url: 'https://res.cloudinary.com/demo/image/upload/b.jpg',
        caption: 'Riverside terrace',
      },
    ],
  });
  expect(s.source).toBe('agent');
  expect(s.lastCorrelationId).toBe('d1');
});
```

- [ ] **Step 2: Update the `setViewFromDev` dream-stage fixture**

Find the test `setViewFromDev sets view + dev source and clears lastCorrelationId`. Replace its body's `setViewFromDev` call and its expected `view` with the new shape:

```ts
it('setViewFromDev sets view + dev source and clears lastCorrelationId', () => {
  store.getState().applyCommand({
    type: 'show_discovery_canvas',
    correlation_id: 'c1',
  });
  store.getState().setViewFromDev({
    type: 'dream_stage',
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: [],
    },
    images: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        caption: 'A',
      },
    ],
  });
  const s = store.getState();
  expect(s.view).toEqual({
    type: 'dream_stage',
    destination: {
      id: 'vienna',
      name: 'Vienna',
      country: 'Austria',
      region: 'Danube',
      aliases: [],
    },
    images: [
      {
        url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        caption: 'A',
      },
    ],
  });
  expect(s.source).toBe('dev');
  expect(s.lastCorrelationId).toBeNull();
});
```

Leave every other test in this file (initial state, `show_discovery_canvas`, `show_itinerary_options`, `soft_redirect`, hint clearing, `setViewFromUser`, `recordParseError`, the booking-summary describe block, the cabin-detail describe block, the add-on decisions describe block) exactly as they are.

- [ ] **Step 3: Run the file**

Run: `pnpm test lib/agent-ui/ui-view-store.test.ts`

Expected: all tests pass.

---

### Task 8: Full verification

**Files:** (no edits)

- [ ] **Step 1: Type-check the whole project**

Run: `pnpm tsc --noEmit`

Expected: no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`

Expected: clean. If a lint rule fires (e.g. unused import, ordering), fix the root cause in the file it points at. Do not use `--fix` blindly on unrelated files and do not disable rules.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`

Expected: green. The renamed/added cases in Tasks 6–7 should be the only relevant deltas in the report.

- [ ] **Step 4: Manual dev-panel check**

Run: `pnpm dev`, open the app, open the dev panel, pick `dream_stage` → "Vienna detail (4 images)" and then "Vienna detail (2 images)". Both should render `PanelDream` with the new images (Cloudinary URLs from the mock). No console errors.

The auto-memory note says no Playwright/Chrome verification unless asked, so this is a manual eyeball pass only — confirm the renders visually, then stop the dev server.

---

### Task 9: Commit and wrap up

**Files:** (commit)

- [ ] **Step 1: Stage and commit**

```bash
git add lib/agent-ui/commands.ts \
        lib/agent-ui/ui-view-types.ts \
        lib/agent-ui/ui-view-store.ts \
        lib/agent-ui/commands.test.ts \
        lib/agent-ui/ui-view-store.test.ts \
        components/panels/dream/panel-dream.tsx \
        lib/dev/mocks.ts

git commit -m "$(cat <<'EOF'
feat(agent-ui): rename show_dream_stage to show_destination_detail

Reshape the command payload to match the real backend wire format
(destination + { url, caption } images). The rendered view stays
'dream_stage'; only the command name and the data flowing into the
view change. Drops the upper image bound — PanelDream is the sole
authority on the visible cap.
EOF
)"
```

- [ ] **Step 2: Confirm clean status**

Run: `git status`

Expected: `nothing to commit, working tree clean` and branch `feat/show-destination-detail-command` ahead of the parent by the new commits (the spec commits + this one).

The branch is not pushed and no PR is opened by this plan — that is left to the user per the project's git workflow.
