# Cabin Detail Modal — In-Panel Restyle Design Spec

**Date:** 2026-05-22
**Status:** Approved for planning
**Owner:** Alan Bruno

## Goal

Restyle the existing **cabin detail modal** so it is confined to the
`cabin_selection` panel area instead of overlaying the whole viewport. The
modal becomes an in-panel overlay: it covers the cabin grid only, leaving the
bottom itinerary bar and the voice input fully visible and interactive.

This is a presentation change. Opening/closing behaviour (by the user via a
card, and by the agent via `set_cabin_detail`) is unchanged.

## Background

Today `CabinDetailModal` uses the shadcn `Dialog`: it portals to `document.body`
and renders a `fixed inset-0` overlay that covers the entire viewport, with a
viewport-centered `DialogContent`.

The target is the reference mockup: a single panel-sized surface with a large
image gallery on the left (~2/3) and a scrollable detail column on the right
(~1/3), all on the panel's beige surface. The bottom itinerary bar and the
voice input remain plainly visible and usable while the modal is open.

## App layout context

```
<div className="flex h-full flex-col">          // app shell
  <div className="relative min-h-0 flex-1">     // THE PANEL AREA
    <ViewController /> -> ContentView -> CabinSelectionView -> PanelCabinSelection
  </div>
  <BookingSummaryContainer />                   // bottom itinerary bar — sibling
</div>
```

"The panel" the modal must fit inside is the content area rendered by
`PanelCabinSelection`. The bottom bar is a *sibling* of that area, so an
overlay scoped to the panel naturally leaves the bottom bar untouched.

## Decisions

- **Modality:** The modal is a **non-modal** in-panel overlay. The bottom
  itinerary bar and the voice input stay active while it is open. It is not a
  focus-trapping modal.
- **Close affordances:** An explicit `X` button in the detail column header
  (top-right), plus `Escape`. Clicking the bottom bar must NOT close it.
- **Surface:** The overlay uses the panel's beige surface (`bg-beige-200`),
  with no card border or shadow — it merges with the panel.
- **Layout:** Two columns on `lg+` (gallery ~2/3 left, detail ~1/3 right),
  stacked and scrollable below `lg`.

## Approach

Chosen among three:

- **A — chosen.** In-panel overlay built on `@radix-ui/react-dialog`
  primitives directly, with `modal={false}`, no `Portal` (rendered inline
  inside the panel), content positioned `absolute inset-0`. Keeps `Escape`,
  `role="dialog"` and focus management; being non-modal it does not block the
  rest of the app.
- **B — rejected.** A plain `div` overlay with a manual `Escape` handler.
  Fewer dependency imports but re-implements accessibility and loses
  focus-restore-on-close.
- **C — rejected, infeasible.** Keep the shadcn `Dialog` and confine it via a
  portal `container`. The shadcn `DialogContent` hardcodes `fixed` positioning
  and always renders a viewport-wide `DialogOverlay`; fixing that would mean
  editing `components/ui/`, which is forbidden.

Approach A imports `@radix-ui/react-dialog` directly instead of using
`components/ui/dialog.tsx`. This is necessary and allowed — the hard rule only
forbids *editing* `components/ui/`, not importing the underlying primitive in
app code. `@radix-ui/react-dialog` is already an installed dependency.

## Components

### `components/panels/cabin/cabin-detail-modal.tsx` — rewrite

- Props unchanged: `{ cabin: Cabin | null; onClose: () => void }`.
- Built on `@radix-ui/react-dialog` primitives:
  - `Dialog.Root` with `open={cabin != null}`, `onOpenChange={(o) => !o && onClose()}`,
    and `modal={false}`.
  - No `Dialog.Portal` — the content renders inline so it is anchored to the
    panel, not `document.body`.
  - `Dialog.Content` positioned `absolute inset-0`, beige surface, no card
    border/shadow.
  - `onInteractOutside` is prevented (`e.preventDefault()`) so only the `X`
    button and `Escape` close the modal — a click on the bottom bar does not.
  - `Dialog.Title` (cabin `name`) and `Dialog.Description` (`sr-only`) retained
    for accessibility.
- Layout:
  - `lg+`: flex row — gallery column ~2/3, detail column ~1/3 (detail column
    max width ~380–420px). Detail column scrolls internally on overflow.
  - below `lg`: stacked column, the whole overlay scrolls.
- Detail column content (unchanged from current, restyled):
  - Header row: cabin `name` as `Dialog.Title` + an `X` close button top-right.
  - Info row: `{guests} guests · {area}m² · from {formatCabinPrice(priceFrom)} EUR · {view}`
    with the existing hairline separators.
  - Three `DetailSection`s — Bedroom, Bathroom, Amenities — from `CABIN_DETAIL`,
    each an icon + heading + hairline-separated feature list. The local
    `DetailSection` helper is kept.

### `components/panels/cabin/panel-cabin-selection.tsx` — small restructure

- Root becomes `relative h-full w-full overflow-hidden` (it never scrolls), so
  the modal's `absolute inset-0` matches the visible panel on every breakpoint.
- The cabin grid moves into an inner `div` that owns the scroll
  (`h-full overflow-y-auto`).
- The grid scroll `div` receives `inert` while the modal is open (it is
  visually covered; nothing behind it should be tabbable).
- `CabinDetailModal` is rendered as the last child of the `relative` root,
  unchanged in props.

### `components/panels/cabin/cabin-detail-gallery.tsx` — minor

- Styling tweaks only if needed to match the mockup's framing (thumbnail
  sizing). Behaviour and props unchanged. Likely minimal or no change.

## Out of scope / unchanged

- `lib/agent-ui/ui-view-store.ts`, `lib/agent-ui/commands.ts`,
  `lib/agent-ui/ui-view-types.ts` — the `set_cabin_detail` command, view type
  and reducer are untouched.
- `lib/dev/mocks.ts` — the existing `cabin_selection` "Detail open" mock is
  reused for verification.
- Existing reducer/parser tests stay green; no behaviour changed.
- Per-cabin detail content, booking CTA, agent open/close reporting — still
  deferred, as in the original spec.

## Verification

- `pnpm` typecheck, lint, and the existing vitest suite all pass.
- Dev panel → `cabin_selection` mock "Detail open (Owner's Suite)":
  - the modal fills the panel area and covers the cabin grid;
  - the bottom itinerary bar and the voice input are visible and clickable;
  - `Escape` and the `X` button close the modal; clicking the bottom bar does
    not.

## Risks / open questions

- **Thumbnail strip vs mockup** — the mockup shows 3 thumbnails for 4 gallery
  images (active one excluded). Current behaviour shows all four with a ring on
  the active one. Default: keep current behaviour; revisit only if an exact
  match is requested.
- **Mobile layout** — the mockup is desktop-first; the stacked mobile layout is
  best-effort.
