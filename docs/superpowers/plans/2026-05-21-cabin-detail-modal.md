# Cabin Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cabin detail modal (image gallery + Bedroom/Bathroom/Amenities feature lists) that opens over the `cabin_selection` view, controllable by both the user and the agent.

**Architecture:** The modal state is a `detailCabinId` field on the `cabin_selection` view variant — the modal is open ⟺ the field is set. The agent drives it via a new `set_cabin_detail` UI command handled in the store reducer; the user drives it via `setViewFromUser`. Detail content is static shared placeholder data. A shadcn `Dialog` renders the modal.

**Tech Stack:** Next.js, TypeScript, React, zustand, Zod, shadcn/ui (`Dialog`), `@phosphor-icons/react`, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-05-21-cabin-detail-modal-design.md`

---

## File structure

| File | Responsibility |
| ---- | -------------- |
| `lib/cabins.ts` (modify) | Add `CABIN_DETAIL` shared content constant |
| `lib/agent-ui/ui-view-types.ts` (modify) | Add `detailCabinId` to `cabin_selection` view |
| `lib/agent-ui/commands.ts` (modify) | Add `set_cabin_detail` Zod command |
| `lib/agent-ui/commands.test.ts` (modify) | Tests for the new command |
| `lib/agent-ui/ui-view-store.ts` (modify) | Reducer case for `set_cabin_detail` |
| `lib/agent-ui/ui-view-store.test.ts` (modify) | Tests for the reducer case |
| `components/panels/cabin/cabin-detail-gallery.tsx` (create) | Main image + thumbnail strip, local active-index state |
| `components/panels/cabin/cabin-detail-modal.tsx` (create) | The `Dialog`; header + detail sections |
| `components/agent-ui/views/cabin-selection-view.tsx` (modify) | Pass the `view` prop down |
| `components/panels/cabin/panel-cabin-selection.tsx` (modify) | Wire expand/close to the store, render the modal |
| `lib/dev/mocks.ts` (modify) | Add a `with_detail` mock |

---

## Task 1: Cabin detail content data

**Files:**
- Modify: `lib/cabins.ts`

- [ ] **Step 1: Append the `CABIN_DETAIL` constant**

Add this at the end of `lib/cabins.ts`, after the existing `formatCabinPrice` function:

```ts
/**
 * Shared placeholder detail content shown in the cabin detail modal.
 * Reused by every cabin until per-cabin content exists.
 */
export const CABIN_DETAIL = {
  gallery: [
    '/cabin-modal/1.png',
    '/cabin-modal/2.png',
    '/cabin-modal/3.png',
    '/cabin-modal/4.png',
  ],
  bedroom: [
    'King-size bed (convertible to two twin beds)',
    'King-size pillows and Superior Cotton linens',
    'Beds face forward',
  ],
  bathroom: [
    'Single vanity',
    'Glass-enclosed shower with overhead and handheld showerhead',
    'Luxurious terry robes, slippers and upscale amenities',
    '220V power',
    'Hairdryer',
  ],
  amenities: [
    'Bedside table with convenient iPad',
    'Closet with shelving and full-height hanging',
    'In-suite safe',
    'Writing desk/vanity area',
    '40" wall-mounted flat-screen HD TV',
    'Refrigerator',
    'Nespresso coffee machine',
    'Adjustable height/extendable coffee/dining table',
    'Sofa',
    'French Balcony',
  ],
} as const;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cabins.ts
git commit -m "feat(cabins): add shared cabin detail content"
```

---

## Task 2: View type field + `set_cabin_detail` command

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`
- Modify: `lib/agent-ui/commands.ts`
- Test: `lib/agent-ui/commands.test.ts`

- [ ] **Step 1: Add `detailCabinId` to the `cabin_selection` view**

In `lib/agent-ui/ui-view-types.ts`, change the `cabin_selection` line of the `UiView` union from:

```ts
  | { type: 'cabin_selection' };
```

to:

```ts
  | { type: 'cabin_selection'; detailCabinId?: string };
```

- [ ] **Step 2: Write the failing command tests**

In `lib/agent-ui/commands.test.ts`, add this `describe` block at the end of the file (after the `set_booking_summary` block, before the file's final closing):

```ts
describe('set_cabin_detail', () => {
  it('parses with a string cabin_id', () => {
    const out = UiCommand.parse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: 'owners-suite' },
    });
    if (out.type !== 'set_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBe('owners-suite');
  });

  it('parses with a null cabin_id', () => {
    const out = UiCommand.parse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: null },
    });
    if (out.type !== 'set_cabin_detail') throw new Error('discriminator failed');
    expect(out.payload.cabin_id).toBeNull();
  });

  it('rejects a missing cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: {},
    });
    expect(out.success).toBe(false);
  });

  it('rejects a numeric cabin_id', () => {
    const out = UiCommand.safeParse({
      type: 'set_cabin_detail',
      correlation_id: 'cd1',
      payload: { cabin_id: 42 },
    });
    expect(out.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test -- commands.test.ts`
Expected: FAIL — the `set_cabin_detail` cases fail because the command type does not exist yet.

- [ ] **Step 4: Add the `set_cabin_detail` command schema**

In `lib/agent-ui/commands.ts`, add this definition right before the `export const UiCommand = z.discriminatedUnion(...)` declaration:

```ts
const SetCabinDetail = Base.extend({
  type: z.literal('set_cabin_detail'),
  payload: z.object({ cabin_id: z.string().nullable() }),
});
```

Then add `SetCabinDetail` to the discriminated union array:

```ts
export const UiCommand = z.discriminatedUnion('type', [
  ShowDiscoveryCanvas,
  SoftRedirect,
  ShowItineraryOptions,
  ShowDreamStage,
  SetBookingSummary,
  SetCabinDetail,
]);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- commands.test.ts`
Expected: PASS — all `set_cabin_detail` cases pass.

- [ ] **Step 6: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat(agent-ui): add set_cabin_detail command and detailCabinId view field"
```

---

## Task 3: Reducer case for `set_cabin_detail`

**Files:**
- Modify: `lib/agent-ui/ui-view-store.ts`
- Test: `lib/agent-ui/ui-view-store.test.ts`

- [ ] **Step 1: Write the failing reducer tests**

In `lib/agent-ui/ui-view-store.test.ts`, add this `describe` block immediately before the final closing `});` of the top-level `describe('ui-view-store', ...)` block (i.e. as a sibling of the `describe('booking summary', ...)` block):

```ts
  describe('cabin detail', () => {
    it('applyCommand(set_cabin_detail) with a cabin_id opens the detail on cabin_selection', () => {
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlation_id: 'cd1',
        payload: { cabin_id: 'owners-suite' },
      });
      const s = store.getState();
      expect(s.view).toEqual({ type: 'cabin_selection', detailCabinId: 'owners-suite' });
      expect(s.source).toBe('agent');
      expect(s.lastCorrelationId).toBe('cd1');
      expect(s.hint).toBeNull();
    });

    it('applyCommand(set_cabin_detail) with null closes the detail', () => {
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlation_id: 'cd2',
        payload: { cabin_id: null },
      });
      expect(store.getState().view).toEqual({ type: 'cabin_selection' });
    });

    it('set_cabin_detail switches to cabin_selection from another view', () => {
      store.getState().applyCommand({ type: 'show_discovery_canvas', correlation_id: 'c1' });
      store.getState().applyCommand({
        type: 'set_cabin_detail',
        correlation_id: 'cd3',
        payload: { cabin_id: 'mozart-suite' },
      });
      expect(store.getState().view).toEqual({
        type: 'cabin_selection',
        detailCabinId: 'mozart-suite',
      });
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- ui-view-store.test.ts`
Expected: FAIL — `set_cabin_detail` is not handled, so the reducer's `default` branch returns `{}` and `view` stays `{ type: 'start' }`.

- [ ] **Step 3: Add the reducer case**

In `lib/agent-ui/ui-view-store.ts`, inside `applyCommand`'s `switch (cmd.type)`, add this `case` immediately before the `default:` branch:

```ts
          case 'set_cabin_detail':
            return {
              view: {
                type: 'cabin_selection',
                detailCabinId: cmd.payload.cabin_id ?? undefined,
              },
              hint: null,
              source: 'agent',
              lastCorrelationId: cmd.correlation_id,
            };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- ui-view-store.test.ts`
Expected: PASS — all `cabin detail` cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/ui-view-store.ts lib/agent-ui/ui-view-store.test.ts
git commit -m "feat(agent-ui): handle set_cabin_detail in the view reducer"
```

---

## Task 4: `CabinDetailGallery` component

**Files:**
- Create: `components/panels/cabin/cabin-detail-gallery.tsx`

No co-located component test (consistent with the existing cabin components). Verification is type-check + lint.

- [ ] **Step 1: Create the gallery component**

Create `components/panels/cabin/cabin-detail-gallery.tsx` with exactly this content:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/shadcn/utils';

type CabinDetailGalleryProps = {
  images: string[];
  alt: string;
};

export function CabinDetailGallery({ images, alt }: CabinDetailGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        <Image
          src={activeSrc}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex shrink-0 gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg transition',
                index === activeIndex
                  ? 'ring-primary ring-2 ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `ring-primary` is the project accent (`--primary` → green-600 in `styles/globals.css`). Per the conventions, do not hardcode colors — use the token.

- [ ] **Step 2: Verify it compiles and lints**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/cabin/cabin-detail-gallery.tsx
git commit -m "feat(cabin): add cabin detail gallery component"
```

---

## Task 5: `CabinDetailModal` component

**Files:**
- Create: `components/panels/cabin/cabin-detail-modal.tsx`

No co-located component test. Verification is type-check + lint.

- [ ] **Step 1: Create the modal component**

Create `components/panels/cabin/cabin-detail-modal.tsx` with exactly this content:

```tsx
'use client';

import { ArmchairIcon, BathtubIcon, BedIcon, type Icon } from '@phosphor-icons/react';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CABIN_DETAIL, type Cabin, formatCabinPrice } from '@/lib/cabins';

type CabinDetailModalProps = {
  cabin: Cabin | null;
  onClose: () => void;
};

function DetailSection({
  icon: SectionIcon,
  title,
  items,
}: {
  icon: Icon;
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 pb-2">
        <SectionIcon className="text-neutral-700" size={20} />
        <h3 className="font-display text-lg font-semibold text-neutral-700">{title}</h3>
      </div>
      <ul className="border-border border-t">
        {items.map((item) => (
          <li
            key={item}
            className="border-border text-muted-foreground border-b py-2 text-sm"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CabinDetailModal({ cabin, onClose }: CabinDetailModalProps) {
  return (
    <Dialog open={cabin != null} onOpenChange={(open) => !open && onClose()}>
      {cabin && (
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 lg:h-[90vh] lg:flex-row">
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:w-1/2">
            <CabinDetailGallery images={[...CABIN_DETAIL.gallery]} alt={cabin.name} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:w-1/2">
            <DialogTitle className="font-display text-3xl leading-tight font-semibold text-neutral-700">
              {cabin.name}
            </DialogTitle>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {[
                `${cabin.guests} guests`,
                `${cabin.area}m²`,
                `from ${formatCabinPrice(cabin.priceFrom)} EUR`,
                cabin.view,
              ].map((item, index) => (
                <span key={item} className="flex items-center gap-3">
                  {index > 0 && <span className="bg-border h-3 w-px" aria-hidden />}
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-6">
              <DetailSection icon={BedIcon} title="Bedroom" items={CABIN_DETAIL.bedroom} />
              <DetailSection icon={BathtubIcon} title="Bathroom" items={CABIN_DETAIL.bathroom} />
              <DetailSection icon={ArmchairIcon} title="Amenities" items={CABIN_DETAIL.amenities} />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
```

Notes:
- The `{cabin && ...}` guard both narrows `cabin` to non-null for TypeScript and avoids rendering `DialogContent` when closed.
- `DialogContent` already renders a built-in close (`X`) button top-right — that is the close affordance, matching the mockup. No extra close button.
- `Icon` is the phosphor icon component type, exported from `@phosphor-icons/react`.

- [ ] **Step 2: Verify it compiles and lints**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

If `npx tsc --noEmit` reports that `Icon` is not exported from `@phosphor-icons/react`, replace the import and the `DetailSection` `icon` prop type with the component type instead:
```ts
import { ArmchairIcon, BathtubIcon, BedIcon } from '@phosphor-icons/react';
// ...
  icon: typeof BedIcon;
```

- [ ] **Step 3: Commit**

```bash
git add components/panels/cabin/cabin-detail-modal.tsx
git commit -m "feat(cabin): add cabin detail modal component"
```

---

## Task 6: Wire the modal into cabin selection

**Files:**
- Modify: `components/agent-ui/views/cabin-selection-view.tsx`
- Modify: `components/panels/cabin/panel-cabin-selection.tsx`

- [ ] **Step 1: Pass the `view` prop down in `CabinSelectionView`**

Replace the entire content of `components/agent-ui/views/cabin-selection-view.tsx` with:

```tsx
'use client';

import { PanelCabinSelection } from '@/components/panels/cabin/panel-cabin-selection';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function CabinSelectionView({
  view,
}: {
  view: Extract<UiView, { type: 'cabin_selection' }>;
}) {
  return <PanelCabinSelection view={view} />;
}
```

- [ ] **Step 2: Wire `PanelCabinSelection` to the store and render the modal**

Replace the entire content of `components/panels/cabin/panel-cabin-selection.tsx` with:

```tsx
'use client';

import { useCallback } from 'react';
import { CabinCard } from '@/components/panels/cabin/cabin-card';
import { CabinDetailModal } from '@/components/panels/cabin/cabin-detail-modal';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { type Cabin, cabins } from '@/lib/cabins';

type PanelCabinSelectionProps = {
  view: Extract<UiView, { type: 'cabin_selection' }>;
};

export function PanelCabinSelection({ view }: PanelCabinSelectionProps) {
  const setViewFromUser = useSetViewFromUser();

  const handleExpand = useCallback(
    (cabin: Cabin) => {
      setViewFromUser({ type: 'cabin_selection', detailCabinId: cabin.id });
    },
    [setViewFromUser]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'cabin_selection' });
  }, [setViewFromUser]);

  const detailCabin = view.detailCabinId
    ? (cabins.find((cabin) => cabin.id === view.detailCabinId) ?? null)
    : null;

  return (
    <div className="bg-beige-200 h-full w-full overflow-y-auto lg:overflow-hidden">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-10 p-6 sm:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-3">
        {cabins.map((cabin) => (
          <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
        ))}
      </div>
      <CabinDetailModal cabin={detailCabin} onClose={handleClose} />
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles, lints, and builds**

Run: `npx tsc --noEmit && pnpm lint && pnpm build`
Expected: no errors. The build confirms the `VIEW_REGISTRY` type (which requires `CabinSelectionView` to accept the `cabin_selection` view) is still satisfied.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all tests, including the new command and reducer tests.

- [ ] **Step 5: Commit**

```bash
git add components/agent-ui/views/cabin-selection-view.tsx components/panels/cabin/panel-cabin-selection.tsx
git commit -m "feat(cabin): open cabin detail modal from card and agent"
```

---

## Task 7: Dev panel mock

**Files:**
- Modify: `lib/dev/mocks.ts`

- [ ] **Step 1: Add the `with_detail` mock**

In `lib/dev/mocks.ts`, replace the `cabin_selection` line of `VIEW_MOCKS`:

```ts
  cabin_selection: [{ id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } }],
```

with:

```ts
  cabin_selection: [
    { id: 'default', label: 'All cabins', view: { type: 'cabin_selection' } },
    {
      id: 'with_detail',
      label: "Detail open (Owner's Suite)",
      view: { type: 'cabin_selection', detailCabinId: 'owners-suite' },
    },
  ],
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "chore(mocks): add cabin_selection detail-open mock"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-PR checklist**

Run: `pnpm lint && pnpm test && pnpm format:check && pnpm build`
Expected: all four pass with no errors.

If `pnpm format:check` reports unformatted files, run `pnpm format`, then re-run the checklist and amend the relevant commit or add a `chore: format` commit.

- [ ] **Step 2: Manual smoke test in the dev panel**

Run: `pnpm dev`. Open the app, click `dev` in the bottom-right corner. Select view `cabin_selection`, mock `Detail open (Owner's Suite)`, click **Apply**.
Expected:
- The cabin grid renders with the modal open over it.
- The modal shows the gallery (4 images, thumbnail strip) on the left, and the header + Bedroom/Bathroom/Amenities sections on the right.
- Clicking a thumbnail swaps the main image and highlights the active thumbnail.
- The `X` button, `Esc`, and clicking the overlay all close the modal.
- Back on the grid, clicking a card's expand button reopens the modal for that cabin.

This step is visual confirmation only — no code changes expected.
