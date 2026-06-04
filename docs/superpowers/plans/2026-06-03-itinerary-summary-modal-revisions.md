# Itinerary Summary Modal — Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply five visual corrections to the already-built Itinerary Summary modal: pin the top bar and footer so they don't scroll, switch the panel surface from beige to near-white, keep the cabin/package cards beige, and remove the Add-On rows from the itinerary column.

**Architecture:** The modal lives under `components/panels/itinerary-summary/`. The shell (`itinerary-summary-modal.tsx`) is restructured into a fixed-height flex column — top bar and footer become non-scrolling flex children (`shrink-0`) and only the body gets `overflow-y-auto`. Background swaps use the existing `--neutral-50` (`#fafafa`) token via `bg-neutral-50`. The Add-On removal deletes dead UI plus the now-unused `addOns` field from the type and mock.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Radix Dialog primitives.

**Branch:** Continue on the existing `feat/itinerary-summary-modal` branch (do not branch off; do not touch `main`).

**Testing note:** Per repo convention (`conventions/testing.md`), React components are not unit-tested — Vitest only collects `lib/**/*.test.ts`. These are visual changes plus one data-shape change. Gates per task are `pnpm lint` (clean) and, for the type/mock change, `pnpm test` (107 passing). Final visual confirmation is the user's dev-panel walkthrough.

---

## File Structure

| File | Change |
| --- | --- |
| `components/panels/itinerary-summary/itinerary-summary-modal.tsx` | Restructure to pin top bar + footer; panel + bars → `bg-neutral-50` |
| `components/panels/itinerary-summary/summary-footer-bar.tsx` | Footer surface → `bg-neutral-50/95`; drop `sticky bottom-0` (parent pins it) |
| `components/panels/itinerary-summary/summary-city-card.tsx` | Remove the Add-On rows block |
| `lib/itinerary-summary/types.ts` | Remove `addOns` from `SummaryItineraryCity` (and `SummaryAddOn` if unused) |
| `lib/itinerary-summary/mock.ts` | Remove `addOns` arrays from the mock cities |

Cabin card (`summary-cabin-card.tsx`) and package card (`summary-package-card.tsx`) already use `bg-beige-50` — **no change**; they read as beige once the panel behind them is near-white.

---

## Task 1: Pin top bar and footer; switch panel surface to near-white

The shell currently puts `overflow-y-auto` on the Radix `Content` and centers a `my-auto` panel inside it, so the whole panel scrolls and the `sticky` bars drift. Restructure so the panel is a viewport-bounded flex column whose body scrolls while the bars stay put. Same change also swaps the beige surfaces to `bg-neutral-50`.

**Files:**
- Modify: `components/panels/itinerary-summary/itinerary-summary-modal.tsx`

- [ ] **Step 1: Restructure the Content/panel and recolor the surfaces**

Replace the current `Content` element (lines 27–75) with the version below. Changes vs. current:
- `Content`: drop `overflow-y-auto`; add `items-center` so the panel centers vertically without `my-auto`.
- Panel `div` (line 28): `bg-beige-100` → `bg-neutral-50`; `my-auto` → `max-h-full`; add `overflow-hidden` so the rounded corners clip the scrolling body.
- Top bar (line 30): `bg-beige-100/95` → `bg-neutral-50/95`; drop `sticky top-0`; add `shrink-0`.
- New body wrapper: the section/grid moves inside a `flex-1 overflow-y-auto min-h-0` div so only the body scrolls.
- Footer stays the last flex child; it no longer needs sticky (handled in Task 2).

```tsx
        <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-center justify-center p-3 outline-none sm:p-6">
          <div className="bg-neutral-50 relative flex max-h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl shadow-xl">
            {/* Top bar (pinned) */}
            <div className="bg-neutral-50/95 z-10 flex shrink-0 items-center justify-between gap-3 rounded-t-3xl px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2">
                <DialogPrimitive.Close asChild>
                  <Button variant="secondary" size="icon-sm" aria-label="Close">
                    <X className="size-4" />
                  </Button>
                </DialogPrimitive.Close>
                <Button variant="secondary" size="icon-sm" aria-label="Share">
                  <Share className="size-4" />
                </Button>
                <Button variant="secondary" size="icon-sm" aria-label="Save">
                  <Save className="size-4" />
                </Button>
              </div>
              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 sm:block">
                <Image src="/riverside-logo.svg" alt="Riverside" width={64} height={48} />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="hidden sm:inline-flex">
                  Talk to a Riverside Specialist
                </Button>
                <Button>Continue to booking</Button>
              </div>
            </div>

            <DialogPrimitive.Title className="sr-only">{data.header.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {data.details.guests} · {data.details.dates} · {data.details.embarkation}
            </DialogPrimitive.Description>

            {/* Body (only this scrolls) */}
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-8 sm:px-6">
              <SummaryHeader header={data.header} />
              <SummaryDetailsRow details={data.details} />
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="flex flex-col gap-8">
                  <SummaryCabinCard cabin={data.cabin} />
                  <SummaryPackageCard pkg={data.package} />
                </div>
                <SummaryItineraryColumn itinerary={data.itinerary} />
              </div>
            </div>

            <SummaryFooterBar total={data.total} />
          </div>
        </DialogPrimitive.Content>
```

Leave the `Overlay` (line 26) and the surrounding `Root`/`Portal` unchanged.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean (no errors, no warnings introduced).

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/itinerary-summary-modal.tsx
git commit -m "fix(itinerary-summary): pin top bar + footer, near-white panel surface"
```

---

## Task 2: Update footer bar surface and drop its sticky positioning

The footer is now a pinned flex child of the panel (Task 1), so it no longer needs `sticky bottom-0 z-10`. Recolor it to match the near-white panel.

**Files:**
- Modify: `components/panels/itinerary-summary/summary-footer-bar.tsx`

- [ ] **Step 1: Replace the wrapper className**

Change line 5 from:

```tsx
    <div className="bg-beige-100/95 border-border sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t px-4 py-4 backdrop-blur sm:px-6">
```

to:

```tsx
    <div className="bg-neutral-50/95 border-border flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t px-4 py-4 backdrop-blur sm:px-6">
```

(Drops `sticky bottom-0 z-10`; adds `shrink-0`; `bg-beige-100/95` → `bg-neutral-50/95`. Keeps the `border-t border-border` divider and rounded bottom.)

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-footer-bar.tsx
git commit -m "fix(itinerary-summary): footer surface near-white, remove sticky"
```

---

## Task 3: Remove Add-On rows from the itinerary city card

The Add-On block at the bottom of each city card is being removed from the right column.

**Files:**
- Modify: `components/panels/itinerary-summary/summary-city-card.tsx`

- [ ] **Step 1: Delete the Add-On rendering block**

Remove these lines (currently 34–42) entirely:

```tsx
      {city.addOns?.map((addOn, i) => (
        <div key={i} className="bg-beige-100 rounded-xl p-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs tracking-wide uppercase">
            <span>{addOn.label}</span>
            <span>{addOn.day}</span>
          </div>
          <p className="text-foreground mt-2 text-sm">{addOn.description}</p>
        </div>
      ))}
```

The component's closing structure should then be:

```tsx
        <div className="flex flex-col items-end gap-2">
          <span className="bg-beige-200 text-primary rounded-md px-3 py-1 text-sm whitespace-nowrap">
            {city.days}
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
            More information
            <ChevronDown className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
```

The `city` prop is still used (`city.image`, `city.name`, `city.country`, `city.days`), so the `SummaryItineraryCity` import stays. No import becomes orphaned by this change.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary-summary/summary-city-card.tsx
git commit -m "fix(itinerary-summary): remove add-on rows from itinerary column"
```

---

## Task 4: Remove the now-unused `addOns` data shape

With the UI gone (Task 3), `addOns` is dead data. Remove it from the type and the mock to keep the model honest.

**Files:**
- Modify: `lib/itinerary-summary/types.ts`
- Modify: `lib/itinerary-summary/mock.ts`

- [ ] **Step 1: Read the type file to confirm the exact shape**

Run: `cat lib/itinerary-summary/types.ts`

Confirm `SummaryItineraryCity` has an `addOns?: ...` field and whether a separate `SummaryAddOn` type exists. (Per the prior plan, the fields are `SummaryAddOn = { label: string; day: string; description: string }` and `SummaryItineraryCity.addOns?: SummaryAddOn[]`.)

- [ ] **Step 2: Remove `addOns` from `SummaryItineraryCity` and delete `SummaryAddOn` if unused**

In `lib/itinerary-summary/types.ts`:
- Delete the `addOns?: SummaryAddOn[];` (or inline-typed equivalent) line from `SummaryItineraryCity`.
- If a standalone `SummaryAddOn` type exists and is now referenced nowhere, delete its declaration and remove it from any export list. (Verify with `grep -rn "SummaryAddOn" .` — if the only hits were the type def and the field just removed, delete it.)

- [ ] **Step 3: Remove `addOns` arrays from the mock**

In `lib/itinerary-summary/mock.ts`, delete every `addOns: [ ... ]` property from the city objects (Vienna and Budapest per the prior mock). Leave each city's `id`, `name`, `country`, `days`, and `image` intact.

- [ ] **Step 4: Typecheck via lint + test**

Run: `pnpm lint`
Expected: clean (no "property does not exist" or unused-symbol errors).

Run: `pnpm test`
Expected: 107 passed (no `lib` test references `addOns`; this confirms the type/mock still compile and nothing depended on the field).

- [ ] **Step 5: Commit**

```bash
git add lib/itinerary-summary/types.ts lib/itinerary-summary/mock.ts
git commit -m "refactor(itinerary-summary): drop unused addOns from type and mock"
```

---

## Final verification

- [ ] **Step 1: Full gate**

```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint clean; 107 tests pass; build compiles (only the pre-existing `metadataBase` warning is acceptable).

- [ ] **Step 2: Hand off the visual walkthrough to the user**

The user runs (browser checks are theirs per their stated preference):
```
pnpm dev → dev panel → view: itinerary + booking summary "Full"
→ click "Itinerary Summary"
```
Confirm: (1) top bar and footer stay fixed while the middle scrolls; (2) panel surface is near-white; (3) cabin and package cards read as beige against it; (4) no Add-On rows appear under the city cards.

---

## Self-Review

**Spec coverage** (the 5 requested fixes):
1. Header + footer don't move on scroll → Task 1 (pin top bar, scroll only body) + Task 2 (footer drops sticky, becomes pinned flex child). ✅
2. Modal background near-white, not beige → Task 1 (`bg-neutral-50` on panel + top bar) + Task 2 (footer). ✅
3. Room/cabin card stays beige → already `bg-beige-50`, explicitly left unchanged; reads beige against the new near-white panel. ✅ (no task needed)
4. Package card stays beige → already `bg-beige-50`, left unchanged. ✅ (no task needed)
5. Remove add-ons from itinerary column → Task 3 (UI) + Task 4 (dead type/mock data). ✅

**Placeholder scan:** No TBD/TODO; every code step shows full classNames/JSX. ✅

**Type consistency:** `bg-neutral-50` used consistently for panel/top-bar/footer; `data.*` prop names match the existing shell; `addOns` removal is consistent across component, type, and mock. ✅
