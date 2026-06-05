# Package selection view — design

**Date:** 2026-06-05
**View type:** `package_selection`
**Status:** Approved, pending implementation plan

## Purpose

Add a new agent-driven view that shows a **comparison table of board/fare packages** (e.g. "Premium All Inclusive Including Excursions", "Full Board", …). Each column is a package with a name, a per-person price, and a "Select" button. Each row is a feature (Wifi, Minibar, Room Service…) whose cell is either included (✓), excluded (✗), or free text ("24h", "€40,- p.p. cover charge applies").

This delivery covers the **view + dev-panel mocks only**. No backend command wiring, no intent dispatch.

## Scope

In scope:

- New `package_selection` variant in `UiView`.
- The view component + a panel that renders the comparison table.
- Registration in `view-registry.ts`.
- Two mocks in `VIEW_MOCKS` (the exact data from the reference screenshot + a 2-column edge case).

Out of scope (visual-only / not touched):

- **"Select" button** — rendered, but does not dispatch any intent.
- **"< Back" button** — rendered as a static visual element to match the screenshot, not wired to navigation.
- **Bottom booking-summary bar** — this is the existing global `BookingSummary` footer, not part of this view.
- **No new `UiCommand`** — the agent cannot trigger this view yet. (Follow `adding-a-command.md` later if needed.)

## Data model

Added to `lib/agent-ui/ui-view-types.ts` (internal, camelCase).

```ts
export type PackageCell =
  | { kind: 'included' }            // ✓
  | { kind: 'excluded' }            // ✗
  | { kind: 'text'; text: string }; // "24h", "€40,- p.p. cover charge applies", etc.

// inside UiView union:
| {
    type: 'package_selection';
    features: { id: string; label: string }[]; // table rows, in display order
    packages: {
      id: string;
      name: string;        // may render on multiple lines
      price: number;       // e.g. 9174
      currency: string;    // ISO 4217, e.g. 'EUR'
      cells: Record<string, PackageCell>; // keyed by feature.id
    }[];
  }
```

Notes:

- `cells` is keyed by `feature.id`. A missing key renders as an empty cell (defensive; not expected in practice).
- Price is a number; the component formats it with `Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 })` → `€ 9,174`. The "per person" sublabel is static copy in the component.
- Types are not added to `commands.ts` (Zod wire protocol) because there is no inbound command yet.

## Components

Mirrors the `cabin_selection` pattern (the view this one is named after).

| File | Responsibility |
| --- | --- |
| `components/agent-ui/views/package-selection-view.tsx` | Thin wrapper, delegates to the panel. Keeps the `view` prop for the registry generics. |
| `components/panels/package/panel-package-selection.tsx` | Renders the comparison table. New `package/` domain folder under `panels/`. |
| `components/agent-ui/view-registry.ts` | Add `package_selection: PackageSelectionView`. |

### Layout (`panel-package-selection.tsx`)

- Root: `bg-beige-200`, full height, scrollable — same shell as `panel-cabin-selection`.
- A CSS grid: first column = feature labels, then one column per package.
  - **Header row** per package column: package `name` (multi-line allowed), then at the bottom the formatted price + "per person" + a "Select" button (visual-only).
  - **Feature rows**: left cell = `feature.label`; each package cell renders ✓ / ✗ / text based on `cell.kind`.
- A static "< Back" pill, top-left, matching the screenshot. Not wired.
- Typography/colors follow existing tokens (beige/green palette already in the app). No new colors in `app-config.ts`.

Cell rendering helper (local to the panel):

- `included` → check icon (lucide `Check`, consistent with the codebase).
- `excluded` → cross icon (lucide `X`).
- `text` → muted paragraph text.

## Mocks

Added to `VIEW_MOCKS` in `lib/dev/mocks.ts`. `package_selection` gets:

1. **`default`** — exact data from the reference screenshot:
   - Features (rows): Wifi · Cakes, Waffles & Ice Cream · Pre-selected Excursions · Minibar · Room Service · Welcome package · Dinner in "The Atelier".
   - Packages (columns):
     - **Premium All Inclusive Including Excursions** — €9,174
     - **Full Board Including Excursions** — €9,174
     - **Premium All Inclusive** — €9,174
     - **Full Board** — €8,850
   - Cell matrix:

     | Feature | PAI+Exc | FB+Exc | PAI | FB |
     | --- | --- | --- | --- | --- |
     | Wifi | ✓ | ✓ | ✓ | ✓ |
     | Cakes, Waffles & Ice Cream | ✓ | ✓ | ✓ | ✓ |
     | Pre-selected Excursions | ✓ | ✓ | ✓ | ✓ |
     | Minibar | ✓ | ✗ | ✓ | ✗ |
     | Room Service | 24h | During opening hours & According to the menu | 24h | During opening hours & According to the menu |
     | Welcome package | Premium Wine, Cocktails, Spirits and French Champagne | Water, Coffee and Tea during meals | Premium Wine, Cocktails, Spirits and French Champagne | Water, Coffee and Tea during meals |
     | Dinner in "The Atelier" | ✓ | €40,- p.p. cover charge applies | ✓ | €25,- p.p. cover charge applies |

   - Note: source screenshot reads "Champange"; corrected to "Champagne" in the mock.

2. **`two_packages`** — a 2-column subset (first two packages) to verify the grid with fewer columns.

Mock conventions: `default` first, `id` snake_case, short `label`.

### Dev-panel wiring

No change to `lib/dev/dev-panel.tsx` is needed. The panel derives its view-type dropdown from `VIEW_TYPES = Object.keys(VIEW_MOCKS)` (`dev-panel.tsx:17`), so adding the `package_selection` entry to `VIEW_MOCKS` automatically wires it into the dev panel (dropdown + mock selector + Apply). Selecting it flips the store `source` to `dev`, same as every other view.

## Testing

Per `conventions/testing.md`, tests live next to the code. A small unit test for the panel's cell rendering / price formatting (`panel-package-selection.test.tsx`) covering: a check cell, a cross cell, a text cell, and the formatted price. Verify `pnpm lint` and `pnpm test` pass before any push.

## Build sequence

1. Add `PackageCell` + `package_selection` to `ui-view-types.ts` → verify: type-checks.
2. Create `panel-package-selection.tsx` + `package-selection-view.tsx` → verify: renders.
3. Register in `view-registry.ts` → verify: exhaustive registry compiles.
4. Add two mocks to `mocks.ts` → verify: appear in dev panel, render correctly.
5. Add panel test → verify: `pnpm test` green.
6. `pnpm lint` + `pnpm test` → verify: both clean.
