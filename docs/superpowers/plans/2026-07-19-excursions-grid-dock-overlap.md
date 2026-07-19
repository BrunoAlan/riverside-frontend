# Excursions grid: clear the chat dock + restore wheel scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two layout bugs in the Excursions tab: (1) the card grid slides under the conversation controls at the bottom-left, and (2) the grid does not scroll when the wheel is over the map / the gaps between cards.

**Architecture:** Both fixes are className changes in `components/panels/itinerary/excursions-panel.tsx`. The left padding adopts the repo's existing dock-clearance idiom (`px-18` = 72px, used by `suggestion-pills.tsx` and `booking-summary.tsx` to clear the 56px controls column plus a gutter). The scroll fix re-enables pointer events on the scroll container: the wrapper's `pointer-events-none` dates from when the map underneath was interactive, but on the Excursions tab the map layer is `inert` + non-interactive (`itinerary-panel.tsx:71-75`), so the wheel over card gaps currently reaches nothing scrollable.

**Tech Stack:** Next.js / React, Tailwind classes only. No store, schema, or logic changes.

## Global Constraints

- Package manager is `pnpm` — never `npm` or `yarn`.
- Never edit `components/ui/` (shadcn primitives).
- eslint and vitest do NOT typecheck in this repo: run `pnpm exec tsc --noEmit` separately; it must be clean before committing.
- Branch: `fix/excursions-grid-dock-overlap` (already created off `main`).
- No React component tests exist in this repo and both changes are pure classNames — verification is `pnpm lint`, `pnpm test` (suite stays green), `pnpm exec tsc --noEmit`. Visual check is done by the user (no browser testing).

---

### Task 1: reserve the dock lane and restore wheel scroll

**Files:**
- Modify: `components/panels/itinerary/excursions-panel.tsx:72,77`

**Interfaces:** none — classNames only, no exports change.

- [ ] **Step 1: Clear the controls column on the left**

At line 72, replace:

```tsx
    <div className="pointer-events-none absolute inset-0 px-6 pt-20 pb-6">
```

with:

```tsx
    // pl-18 clears the chat controls column at the bottom-left (left-4 inset +
    // size-10 buttons + gutter), same clearance the pills row and booking
    // summary use. Left-only: the dock never occupies the right edge.
    <div className="pointer-events-none absolute inset-0 pt-20 pr-6 pb-6 pl-18">
```

(Keep the existing `pt-20` comment above the div as is.)

- [ ] **Step 2: Re-enable pointer events on the scroll container**

At line 77, replace:

```tsx
        className="scrollbar-hide flex h-full flex-wrap content-start items-start gap-3 overflow-y-auto"
```

with:

```tsx
        // pointer-events-auto: the wrapper is pointer-events-none, so without
        // this the wheel only scrolls when the cursor is exactly over a card —
        // over the gaps it falls through to the inert map and nothing scrolls.
        // The map is non-interactive on this tab, so nothing is stolen from it.
        className="scrollbar-hide pointer-events-auto flex h-full flex-wrap content-start items-start gap-3 overflow-y-auto"
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm test && pnpm exec tsc --noEmit`
Expected: lint clean, full suite green (no test reads these classNames), tsc clean.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/excursions-panel.tsx
git commit -m "fix(excursions): clear the chat dock lane and restore wheel scroll"
```
