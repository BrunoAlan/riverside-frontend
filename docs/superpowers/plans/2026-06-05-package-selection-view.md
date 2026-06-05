# Package Selection View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `package_selection` agent-driven view that renders a board/fare comparison table, wired into the dev panel via mocks (no backend command).

**Architecture:** A new `UiView` variant `package_selection` carries `features` (rows) and `packages` (columns) where each cell is `included` / `excluded` / `text`. A thin view component delegates to `PanelPackageSelection`, which renders a CSS grid. Price formatting lives in a pure `lib/packages.ts` helper (the only unit-tested piece, mirroring `lib/cabins.ts`). The dev panel auto-discovers the view from `VIEW_MOCKS`.

**Tech Stack:** Next.js + React (client component), Tailwind, `@phosphor-icons/react`, Vitest (lib only).

---

## File structure

| File | Responsibility |
| --- | --- |
| `lib/packages.ts` (create) | `formatPackagePrice(price, currency)` pure helper. |
| `lib/packages.test.ts` (create) | Unit test for the helper. |
| `lib/agent-ui/ui-view-types.ts` (modify) | Add `PackageCell` + `package_selection` variant. |
| `components/panels/package/panel-package-selection.tsx` (create) | Comparison-table renderer. |
| `components/agent-ui/views/package-selection-view.tsx` (create) | Thin view wrapper. |
| `components/agent-ui/view-registry.ts` (modify) | Register `package_selection`. |
| `lib/dev/mocks.ts` (modify) | Add `package_selection` mocks (`default`, `two_packages`). |

Note: `lib/dev/dev-panel.tsx` is **not** modified — it derives its dropdown from `Object.keys(VIEW_MOCKS)` (`dev-panel.tsx:17`), so the new mocks wire the view into the dev panel automatically.

---

## Task 1: Price formatting helper (TDD)

**Files:**
- Create: `lib/packages.ts`
- Test: `lib/packages.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/packages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatPackagePrice } from './packages';

describe('formatPackagePrice', () => {
  it('formats a EUR amount with the currency symbol and no decimals', () => {
    expect(formatPackagePrice(9174, 'EUR')).toBe('€9,174');
  });

  it('formats another EUR amount', () => {
    expect(formatPackagePrice(8850, 'EUR')).toBe('€8,850');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages`
Expected: FAIL — cannot resolve `./packages` / `formatPackagePrice is not a function`.

- [ ] **Step 3: Write minimal implementation**

`lib/packages.ts`:

```ts
/** Formats a package price with its currency symbol, e.g. (9174, 'EUR') -> "€9,174". */
export function formatPackagePrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test packages`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/packages.ts lib/packages.test.ts
git commit -m "feat(packages): formatPackagePrice helper"
```

---

## Task 2: Add the `package_selection` view type

**Files:**
- Modify: `lib/agent-ui/ui-view-types.ts`

- [ ] **Step 1: Add the cell type and view variant**

In `lib/agent-ui/ui-view-types.ts`, add the `PackageCell` export above the `UiView` union, and add the new variant as the last member of the union:

```ts
export type PackageCell =
  | { kind: 'included' }
  | { kind: 'excluded' }
  | { kind: 'text'; text: string };

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  cells: Record<string, PackageCell>; // keyed by feature.id
}
```

Then extend the union (add the trailing member; keep the existing ones unchanged):

```ts
  | { type: 'cabin_selection'; cabins: Cabin[]; detailCabinId?: string }
  | {
      type: 'package_selection';
      features: { id: string; label: string }[];
      packages: PackageOption[];
    };
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: a type error in `components/agent-ui/view-registry.ts` (registry is now non-exhaustive — `package_selection` missing). This is expected; Task 4 fixes it. Do not commit yet.

- [ ] **Step 3: Commit**

```bash
git add lib/agent-ui/ui-view-types.ts
git commit -m "feat(agent-ui): add package_selection view type"
```

---

## Task 3: Comparison-table panel

**Files:**
- Create: `components/panels/package/panel-package-selection.tsx`

- [ ] **Step 1: Write the component**

`components/panels/package/panel-package-selection.tsx`:

```tsx
'use client';

import { Fragment } from 'react';
import { CaretLeftIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { PackageCell, UiView } from '@/lib/agent-ui/ui-view-types';
import { formatPackagePrice } from '@/lib/packages';

type PanelPackageSelectionProps = {
  view: Extract<UiView, { type: 'package_selection' }>;
};

function Cell({ cell }: { cell: PackageCell | undefined }) {
  if (!cell) return null;
  if (cell.kind === 'included') return <CheckIcon size={20} className="text-neutral-600" />;
  if (cell.kind === 'excluded') return <XIcon size={20} className="text-neutral-400" />;
  return <p className="text-sm leading-snug text-neutral-600">{cell.text}</p>;
}

export function PanelPackageSelection({ view }: PanelPackageSelectionProps) {
  const { features, packages } = view;
  const gridTemplateColumns = `minmax(160px, 220px) repeat(${packages.length}, minmax(180px, 1fr))`;

  return (
    <div className="bg-beige-200 h-full w-full overflow-auto">
      <div className="mx-auto max-w-[1400px] p-6 pt-16">
        {/* Back button — visual only, not wired */}
        <Button type="button" variant="secondary" size="sm" className="mb-10">
          <CaretLeftIcon weight="bold" /> Back
        </Button>

        <div className="grid items-start gap-x-6 gap-y-8" style={{ gridTemplateColumns }}>
          {/* Header row: package names */}
          <div />
          {packages.map((pkg) => (
            <p
              key={pkg.id}
              className="font-display text-xl leading-tight font-medium text-neutral-700"
            >
              {pkg.name}
            </p>
          ))}

          {/* Feature rows */}
          {features.map((feature) => (
            <Fragment key={feature.id}>
              <p className="text-sm text-neutral-500">{feature.label}</p>
              {packages.map((pkg) => (
                <div key={pkg.id} className="flex min-h-6 items-start">
                  <Cell cell={pkg.cells[feature.id]} />
                </div>
              ))}
            </Fragment>
          ))}

          {/* Price + Select row */}
          <div />
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className="font-display text-2xl leading-none text-neutral-700">
                  {formatPackagePrice(pkg.price, pkg.currency)}
                </p>
                <p className="pt-1 text-xs text-neutral-500">per person</p>
              </div>
              <Button type="button" variant="secondary" size="sm">
                Select
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: still only the registry exhaustiveness error from Task 2 (fixed next). No new errors in this file.

- [ ] **Step 3: Commit**

```bash
git add components/panels/package/panel-package-selection.tsx
git commit -m "feat(panels): package comparison table"
```

---

## Task 4: View wrapper + registry

**Files:**
- Create: `components/agent-ui/views/package-selection-view.tsx`
- Modify: `components/agent-ui/view-registry.ts`

- [ ] **Step 1: Write the view wrapper**

`components/agent-ui/views/package-selection-view.tsx`:

```tsx
'use client';

import { PanelPackageSelection } from '@/components/panels/package/panel-package-selection';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export function PackageSelectionView({
  view,
}: {
  view: Extract<UiView, { type: 'package_selection' }>;
}) {
  return <PanelPackageSelection view={view} />;
}
```

- [ ] **Step 2: Register it**

In `components/agent-ui/view-registry.ts`, add the import (alphabetical-ish, after the cabin import) and the registry entry:

```ts
import { CabinSelectionView } from './views/cabin-selection-view';
import { CompareItineraryView } from './views/compare-itinerary-view';
import { DreamStageView } from './views/dream-stage-view';
import { ItineraryView } from './views/itinerary-view';
import { PackageSelectionView } from './views/package-selection-view';
import { PresentationView } from './views/presentation-view';
import { StartView } from './views/start-view';
```

```ts
export const VIEW_REGISTRY: ViewRegistry = {
  start: StartView,
  presentation: PresentationView,
  dream_stage: DreamStageView,
  itinerary: ItineraryView,
  compare_itinerary: CompareItineraryView,
  cabin_selection: CabinSelectionView,
  package_selection: PackageSelectionView,
};
```

- [ ] **Step 3: Verify the registry is now exhaustive**

Run: `pnpm lint`
Expected: PASS — the exhaustiveness error from Task 2 is gone, no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/agent-ui/views/package-selection-view.tsx components/agent-ui/view-registry.ts
git commit -m "feat(agent-ui): register package_selection view"
```

---

## Task 5: Dev-panel mocks

**Files:**
- Modify: `lib/dev/mocks.ts`

- [ ] **Step 1: Add the `package_selection` entry to `VIEW_MOCKS`**

At the top of `lib/dev/mocks.ts`, after the existing imports, add cell shorthands and the package fixtures. Then add the `package_selection` key to the `VIEW_MOCKS` object (after `cabin_selection`).

Add near the other fixtures (above `export const VIEW_MOCKS`):

```ts
import type { PackageCell, PackageOption } from '@/lib/agent-ui/ui-view-types';

const inc: PackageCell = { kind: 'included' };
const exc: PackageCell = { kind: 'excluded' };
const txt = (text: string): PackageCell => ({ kind: 'text', text });

const packageFeatures = [
  { id: 'wifi', label: 'Wifi' },
  { id: 'cakes', label: 'Cakes, Waffles & Ice Cream' },
  { id: 'excursions', label: 'Pre-selected Excursions' },
  { id: 'minibar', label: 'Minibar' },
  { id: 'room_service', label: 'Room Service' },
  { id: 'welcome_package', label: 'Welcome package' },
  { id: 'dinner_atelier', label: 'Dinner in "The Atelier"' },
];

const premiumWelcome = 'Premium Wine, Cocktails, Spirits and French Champagne';
const fullBoardWelcome = 'Water, Coffee and Tea during meals';
const limitedRoomService = 'During opening hours & According to the menu';

const samplePackages: PackageOption[] = [
  {
    id: 'premium_all_inclusive_excursions',
    name: 'Premium All Inclusive Including Excursions',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: inc,
      room_service: txt('24h'),
      welcome_package: txt(premiumWelcome),
      dinner_atelier: inc,
    },
  },
  {
    id: 'full_board_excursions',
    name: 'Full Board Including Excursions',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: exc,
      room_service: txt(limitedRoomService),
      welcome_package: txt(fullBoardWelcome),
      dinner_atelier: txt('€40,- p.p. cover charge applies'),
    },
  },
  {
    id: 'premium_all_inclusive',
    name: 'Premium All Inclusive',
    price: 9174,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: inc,
      room_service: txt('24h'),
      welcome_package: txt(premiumWelcome),
      dinner_atelier: inc,
    },
  },
  {
    id: 'full_board',
    name: 'Full Board',
    price: 8850,
    currency: 'EUR',
    cells: {
      wifi: inc,
      cakes: inc,
      excursions: inc,
      minibar: exc,
      room_service: txt(limitedRoomService),
      welcome_package: txt(fullBoardWelcome),
      dinner_atelier: txt('€25,- p.p. cover charge applies'),
    },
  },
];
```

Then add to the `VIEW_MOCKS` object, immediately after the `cabin_selection` entry:

```ts
  package_selection: [
    {
      id: 'default',
      label: 'Four boards (matches Figma)',
      view: { type: 'package_selection', features: packageFeatures, packages: samplePackages },
    },
    {
      id: 'two_packages',
      label: 'Two boards',
      view: {
        type: 'package_selection',
        features: packageFeatures,
        packages: samplePackages.slice(0, 2),
      },
    },
  ],
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm lint`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "feat(dev): package_selection mocks"
```

---

## Task 6: Verify end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite and linter**

Run: `pnpm lint && pnpm test`
Expected: both PASS (includes the new `formatPackagePrice` tests).

- [ ] **Step 2: Verify in the dev panel**

Run: `pnpm dev`, open the app, click `dev` (bottom-right). In the view dropdown choose `package_selection`, pick the `default` mock, click **Apply**.
Expected: the comparison table renders with 4 package columns, 7 feature rows (checks/crosses/text matching the screenshot), a price + "per person" + "Select" under each column, and a "< Back" pill top-left. Switch to the `two_packages` mock and confirm the grid collapses to 2 columns. Tune spacing/typography here if needed (UI-only, no test impact).

- [ ] **Step 3: Final confirmation**

No commit needed if Steps 1–2 pass. If visual tuning was done in Step 2, commit it:

```bash
git add components/panels/package/panel-package-selection.tsx
git commit -m "style(panels): tune package comparison table spacing"
```

---

## Self-review notes

- **Spec coverage:** view type (Task 2), components mirroring `cabin_selection` (Tasks 3–4), registry (Task 4), two mocks with exact screenshot data + "Champagne" correction (Task 5), dev-panel auto-wiring (Task 5 note), price as number+currency via `Intl` (Task 1). Select/Back are visual-only as specified.
- **Testing deviation from spec:** the spec proposed a panel component test, but `conventions/testing.md` states React components are not unit-tested (only `lib/**/*.test.ts` is collected). The plan instead tests the extracted `formatPackagePrice` helper and verifies the UI visually in the dev panel — consistent with the convention and the `formatCabinPrice` precedent.
- **Type consistency:** `PackageCell`, `PackageOption`, `formatPackagePrice(price, currency)`, feature ids, and package `cells` keys are identical across Tasks 1, 2, 3, and 5.
