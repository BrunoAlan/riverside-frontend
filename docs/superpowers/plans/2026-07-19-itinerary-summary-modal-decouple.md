# Itinerary summary modal decouple — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `show_itinerary_summary` opens the summary modal from any view — today the modal is mounted inside the `BookingSummary` card, so the command is invisible whenever that card is not on screen (`start` view, or before the first `set_booking_summary`).

**Architecture:** Extract an `ItinerarySummaryModalContainer` (same pattern as `BookingFormModalContainer`) that reads the `itinerarySummary` slice directly and mount it at the app root. `BookingSummary` keeps its button but loses the inline modal render. No store or schema changes — the slice and command already work.

**Tech Stack:** Next.js / React, Zustand hooks, Radix dialog (existing modal untouched).

**Context:** The backend opens this modal two ways, both verified working: tap → `view_itinerary_summary` intent → `show_itinerary_summary`, and voice → `review_selection` → same command. The voice path is what makes the card-less case reachable.

## Global Constraints

- Package manager is `pnpm` — never `npm` or `yarn`.
- Never edit `components/ui/` (shadcn primitives).
- eslint and vitest do NOT typecheck in this repo: run `pnpm exec tsc --noEmit` separately; it must be clean before committing.
- Branch: `feat/agent-suggestions-command-drift` (continue on it; do not branch).
- No React component tests exist in this repo — this is a JSX relocation with no store/schema change, so verification is `pnpm lint`, `pnpm test` (suite must stay green), and `pnpm exec tsc --noEmit`.
- No browser testing (user preference; the user verifies visually themselves).

---

### Task 1: mount the summary modal at the app root

**Files:**
- Modify: `components/panels/itinerary-summary/itinerary-summary-modal.tsx` (append container)
- Modify: `components/agent-ui/booking-summary.tsx:14-22,69-72,150-158`
- Modify: `components/layout/app.tsx` (mount next to `BookingFormModalContainer`)

**Interfaces:**
- Consumes: `useItinerarySummary()` / `useCloseItinerarySummary()` from `@/lib/agent-ui/hooks` (existing).
- Produces: `ItinerarySummaryModalContainer(): JSX | null` exported from `itinerary-summary-modal.tsx`; Task 2 documents the behavior change.

- [ ] **Step 1: Add the container to `itinerary-summary-modal.tsx`**

Append at the end of the file (add the hooks import to the top of the file; keep existing imports and directives as they are):

```tsx
import { useCloseItinerarySummary, useItinerarySummary } from '@/lib/agent-ui/hooks';
```

```tsx
// Mounted at the app root (app.tsx), NOT inside the BookingSummary card: the
// agent can open the summary by voice (review_selection) before any booking
// summary exists, and the modal must not depend on that card being on screen.
export function ItinerarySummaryModalContainer() {
  const itinerarySummary = useItinerarySummary();
  const closeItinerarySummary = useCloseItinerarySummary();
  if (!itinerarySummary) return null;
  return (
    <ItinerarySummaryModal
      open
      onOpenChange={(open) => {
        if (!open) closeItinerarySummary();
      }}
      data={itinerarySummary}
    />
  );
}
```

If the file lacks a `'use client'` directive, add it at the top (the container uses hooks).

- [ ] **Step 2: Remove the inline modal from `booking-summary.tsx`**

Three removals, all orphans of this change:

1. Delete the JSX block at lines 150-158:

```tsx
      {itinerarySummary && (
        <ItinerarySummaryModal
          open
          onOpenChange={(o) => {
            if (!o) closeItinerarySummary();
          }}
          data={itinerarySummary}
        />
      )}
```

2. Delete the two hook reads in `BookingSummary` (lines 71-72):

```tsx
  const itinerarySummary = useItinerarySummary();
  const closeItinerarySummary = useCloseItinerarySummary();
```

3. Delete the now-unused imports: `ItinerarySummaryModal` (line 14) and `useCloseItinerarySummary`, `useItinerarySummary` from the hooks import (keep `useVisibleBookingSummary`).

The `sendIntent('view_itinerary_summary')` button (line 125) stays exactly as is.

- [ ] **Step 3: Mount the container in `app.tsx`**

Add the import:

```tsx
import { ItinerarySummaryModalContainer } from '@/components/panels/itinerary-summary/itinerary-summary-modal';
```

Render it next to the booking form modal:

```tsx
        <ItinerarySummaryModalContainer />
        <BookingFormModalContainer />
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm test && pnpm exec tsc --noEmit`
Expected: lint clean, full suite green (no test touches the moved JSX), tsc clean.

- [ ] **Step 5: Commit**

```bash
git add components/panels/itinerary-summary/itinerary-summary-modal.tsx components/agent-ui/booking-summary.tsx components/layout/app.tsx
git commit -m "fix(summary): mount itinerary summary modal at app root"
```

---

### Task 2: document the summary-modal state and the close-intent request

**Files:**
- Modify: `docs/2026-07-19-agent-ui-backend-requests.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Add the behavior note to section 1**

In the "Notas de comportamiento" list, after the `show_cabin_detail` bullet, add:

```markdown
- `show_itinerary_summary` abre el modal de summary desde cualquier vista — no
  depende de que la booking summary esté en pantalla.
```

- [ ] **Step 2: Add the request section**

Append after section 2.9:

```markdown
### 2.10 Aviso de cierre del summary modal

Abrir el summary ya funciona por las dos vías: tap (intent
`view_itinerary_summary`) y voz (`review_selection`), ambas emiten
`show_itinerary_summary`. Lo que falta es la contracara: cuando el usuario
cierra el modal, el backend no se entera — a diferencia del detalle de cabina
(`view_cabin_selection`) y de excursión (`view_itinerary`), que sí tienen su
intent de cierre.

Pedimos: un intent de cierre para el summary (el nombre que prefieran — p. ej.
`view_itinerary_summary_closed` o reutilizar un `view_*` existente, avísennos
cuál). Apenas lo definan, lo emitimos desde el frontend al cerrar el modal.
```

- [ ] **Step 3: Commit**

```bash
git add docs/2026-07-19-agent-ui-backend-requests.md
git commit -m "docs(contract): summary modal opens anywhere, request close intent"
```
