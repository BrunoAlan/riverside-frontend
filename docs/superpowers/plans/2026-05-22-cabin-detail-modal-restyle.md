# Cabin Detail Modal In-Panel Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the cabin detail modal so it is an overlay confined to the `cabin_selection` panel area instead of a viewport-wide shadcn `Dialog`, leaving the bottom itinerary bar and voice input visible and interactive.

**Architecture:** The modal becomes a non-modal in-panel overlay. `PanelCabinSelection` gets a `relative` non-scrolling root with the cabin grid moved into an inner scroll `div`; `CabinDetailModal` is rewritten on `@radix-ui/react-dialog` primitives with `modal={false}`, no `Portal`, and an `absolute inset-0` content that anchors to that root.

**Tech Stack:** Next.js 15 (React 19), TypeScript, Tailwind v4, `@radix-ui/react-dialog` (already installed), `@phosphor-icons/react`.

---

## Spec

Design spec: `docs/superpowers/specs/2026-05-22-cabin-detail-modal-restyle-design.md`

## Notes for the implementer

- **Package manager is `pnpm`.** Never use `npm`/`yarn`.
- **Do not edit `components/ui/`.** This plan deliberately uses
  `@radix-ui/react-dialog` primitives directly in app code instead of the
  shadcn `Dialog` wrapper — that is intentional and allowed; the rule only
  forbids editing files inside `components/ui/`.
- There are no co-located unit tests for these cabin components (matches the
  existing codebase: the modal/gallery have none). These changes are layout
  and styling, verified by typecheck, lint, the existing test suite, and the
  dev-panel mock. Do not fabricate component tests.
- Verification commands used throughout:
  - Typecheck: `pnpm exec tsc --noEmit`
  - Lint: `pnpm lint`
  - Tests: `pnpm test`

---

## File Structure

- **Modify** `components/panels/cabin/panel-cabin-selection.tsx` — non-scrolling
  `relative` root; cabin grid moved into an inner scroll `div`; that `div`
  marked `inert` while the modal is open.
- **Rewrite** `components/panels/cabin/cabin-detail-modal.tsx` — in-panel
  overlay built on `@radix-ui/react-dialog` primitives.
- `components/panels/cabin/cabin-detail-gallery.tsx` — **unchanged**.
- Store, commands, view types, dev mocks, existing tests — **unchanged**.

---

## Task 1: Restructure `PanelCabinSelection` into a non-scrolling overlay anchor

**Files:**
- Modify: `components/panels/cabin/panel-cabin-selection.tsx`

The current root `div` is both the beige surface and the scroll container. The
modal's `absolute inset-0` needs a `relative`, non-scrolling anchor that always
matches the visible panel. Make the root `relative overflow-hidden` and move the
grid into an inner scroll `div`. Mark that inner `div` `inert` while the modal
is open so nothing behind the overlay is tabbable.

After this task the app still works: the modal is still the old shadcn `Dialog`
(a viewport overlay) — it is rewritten in Task 2.

- [ ] **Step 1: Replace the returned JSX**

In `components/panels/cabin/panel-cabin-selection.tsx`, replace the entire
`return (...)` block of `PanelCabinSelection` with:

```tsx
  return (
    <div className="bg-beige-200 relative h-full w-full overflow-hidden">
      <div className="h-full overflow-y-auto" inert={detailCabin != null}>
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-10 p-6 sm:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-3">
          {cabins.map((cabin) => (
            <CabinCard key={cabin.id} cabin={cabin} onExpand={handleExpand} />
          ))}
        </div>
      </div>
      <CabinDetailModal cabin={detailCabin} onClose={handleClose} />
    </div>
  );
```

Nothing else in the file changes — `handleExpand`, `handleClose`, `detailCabin`
and the imports stay as they are.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (`inert` is a valid boolean prop on React 19 DOM types.)

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Run the existing test suite**

Run: `pnpm test`
Expected: all tests pass — this change touches no tested logic.

- [ ] **Step 5: Commit**

```bash
git add components/panels/cabin/panel-cabin-selection.tsx
git commit -m "refactor(cabin): make selection panel a non-scrolling overlay anchor"
```

---

## Task 2: Rewrite `CabinDetailModal` as an in-panel overlay

**Files:**
- Rewrite: `components/panels/cabin/cabin-detail-modal.tsx`

Replace the shadcn `Dialog` (viewport-wide, portal to `body`) with an overlay
built on `@radix-ui/react-dialog` primitives: `modal={false}`, no `Portal` (so
it renders inline inside the `relative` panel root from Task 1), `Content`
positioned `absolute inset-0` on the beige surface. The detail column carries
an explicit `X` close button; `onInteractOutside` is prevented so only the `X`
and `Escape` close it.

- [ ] **Step 1: Replace the whole file**

Replace the entire contents of `components/panels/cabin/cabin-detail-modal.tsx`
with:

```tsx
'use client';

import { ArmchairIcon, BathtubIcon, BedIcon, XIcon } from '@phosphor-icons/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CabinDetailGallery } from '@/components/panels/cabin/cabin-detail-gallery';
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
  icon: typeof BedIcon;
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
          <li key={item} className="border-border text-muted-foreground border-b py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CabinDetailModal({ cabin, onClose }: CabinDetailModalProps) {
  return (
    <DialogPrimitive.Root
      open={cabin != null}
      onOpenChange={(open) => !open && onClose()}
      modal={false}
    >
      {cabin && (
        <DialogPrimitive.Content
          onInteractOutside={(event) => event.preventDefault()}
          className="bg-beige-200 absolute inset-0 flex flex-col overflow-y-auto outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:flex-row lg:overflow-hidden"
        >
          <div className="h-72 shrink-0 sm:h-80 lg:h-auto lg:flex-1">
            <CabinDetailGallery images={[...CABIN_DETAIL.gallery]} alt={cabin.name} />
          </div>
          <div className="p-6 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <DialogPrimitive.Title className="font-display text-3xl leading-tight font-semibold text-neutral-700">
                {cabin.name}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="text-muted-foreground hover:bg-beige-300 focus-visible:ring-ring/50 -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:text-neutral-700 focus-visible:ring-[3px]"
              >
                <XIcon size={18} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              {cabin.name} cabin details
            </DialogPrimitive.Description>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {[
                `${cabin.guests} guests`,
                `${cabin.area}m²`,
                `from ${formatCabinPrice(cabin.priceFrom)} EUR`,
                cabin.view,
              ].map((item, index) => (
                <span key={index} className="flex items-center gap-3">
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
        </DialogPrimitive.Content>
      )}
    </DialogPrimitive.Root>
  );
}
```

Key points in this rewrite:

- `modal={false}` — the overlay does not trap focus or make the rest of the app
  inert. The bottom itinerary bar and voice input stay interactive.
- No `DialogPrimitive.Portal` — `Content` renders inline, so `absolute inset-0`
  anchors to the `relative` `PanelCabinSelection` root from Task 1.
- `onInteractOutside` is prevented — a click on the bottom bar does not close
  the modal. Closing happens via the `X` button or `Escape` (Radix's default
  `onEscapeKeyDown` still fires when `modal={false}`).
- `Content` is `flex flex-col` on mobile (gallery on top, whole overlay
  scrolls) and `lg:flex-row` on desktop (gallery `lg:flex-1` ~2/3, detail
  column fixed `lg:w-[400px]` with its own `lg:overflow-y-auto`).
- The `{cabin && ...}` guard is required: `Content`'s children read `cabin.*`
  eagerly, so `Content` must not be in the tree when `cabin` is `null`.
- `DialogPrimitive.Title` and `DialogPrimitive.Description` are kept so Radix's
  dialog accessibility warnings stay satisfied.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors. (The old `@/components/ui/dialog` import is gone; verify
no unused-import warnings remain.)

- [ ] **Step 4: Run the existing test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/panels/cabin/cabin-detail-modal.tsx
git commit -m "feat(cabin): restyle detail modal as in-panel overlay"
```

---

## Task 3: Manual verification in the dev panel

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: the app builds and serves with no errors in the terminal.

- [ ] **Step 2: Open the modal mock**

In the browser, open the dev panel and select the `cabin_selection` mock
**"Detail open (Owner's Suite)"**.

Verify:
- The modal fills the cabin-selection panel area and covers the cabin grid.
- The gallery sits left (~2/3), the detail column right (~1/3) on a desktop
  width; below `lg` they stack and the overlay scrolls.
- The detail column shows the title, the info row, and the Bedroom / Bathroom /
  Amenities sections, scrolling internally if it overflows.
- The bottom itinerary bar and the voice input are fully visible and clickable
  while the modal is open.

- [ ] **Step 3: Verify close behaviour**

- Pressing `Escape` closes the modal.
- Clicking the `X` in the detail column header closes the modal.
- Clicking the bottom itinerary bar does **not** close the modal.

- [ ] **Step 4: Verify the existing default mock**

Select the `cabin_selection` mock **"Grid"**: the cabin grid renders and
scrolls normally with no modal present.

- [ ] **Step 5: Final full check and commit (if any fixes were needed)**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: all pass.

If Steps 2–4 required code fixes, commit them:

```bash
git add -A
git commit -m "fix(cabin): polish detail modal in-panel layout"
```

If no fixes were needed, this task produces no commit.

---

## Self-Review

**Spec coverage:**

- In-panel overlay confined to the panel → Task 1 (anchor) + Task 2 (`absolute inset-0`).
- Bottom bar / voice input stay interactive → Task 2 (`modal={false}`, no `Portal`).
- Beige surface, no card chrome → Task 2 (`bg-beige-200`, no border/shadow).
- `X` in detail header + `Escape`; bottom-bar click does not close → Task 2
  (`DialogPrimitive.Close`, `onInteractOutside` prevented).
- Two-column `lg`, stacked below → Task 2 (`flex-col` / `lg:flex-row`).
- Grid not tabbable behind the overlay → Task 1 (`inert`).
- Store / command / view type / mocks / tests unchanged → no task touches them.
- Verification via typecheck, lint, existing suite, dev-panel mock → every task.

**Placeholder scan:** none — all steps contain concrete code and commands.

**Type consistency:** `CabinDetailModalProps` (`{ cabin: Cabin | null; onClose }`)
is unchanged, so the `<CabinDetailModal cabin={detailCabin} onClose={handleClose} />`
call site in Task 1 stays valid against the Task 2 rewrite.
