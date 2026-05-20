# Panels by Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `components/panels/` into per-domain subfolders (`map/`, `cabin/`, `dream/`) and delete two orphan files, with no behavior changes.

**Architecture:** Pure file-move refactor. Files keep their names; only their paths change. Imports are updated at both consumer sites (mainly `agent-ui/views/`) and within `panels/` itself. Two unused files (`panel-window.tsx`, `compare-itinerary.tsx`) are deleted. The project layout convention doc is updated to describe the new shape.

**Tech Stack:** Next.js 15 (App Router), TypeScript, pnpm, Vitest, ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-05-20-panels-by-domain-design.md`

**Verification commands:**
- Type check: `pnpm exec tsc --noEmit`
- Lint: `pnpm lint`
- Tests: `pnpm test`

**General notes for the executor:**
- Use `git mv` for every file move so history is preserved.
- After each task, the three verification commands above MUST be green before committing.
- The user has a memory preference: do NOT run Playwright / browser-based visual tests unless they ask. Manual smoke is enough at the end.
- Do not rename files. Only paths change.
- Do not edit `components/ui/` (shadcn primitives).

---

### Task 1: Delete orphan `panel-window.tsx`

**Files:**
- Delete: `components/panels/panel-window.tsx`

**Context:** This is a 5-line wrapper over `WindowBackground`. A repo-wide grep for `panel-window` or `PanelWindow` returns only its own definition — no importers.

- [ ] **Step 1: Confirm no consumers**

Run:
```bash
grep -rn "panel-window\|PanelWindow" components app lib hooks 2>/dev/null
```
Expected: only `components/panels/panel-window.tsx` itself appears.

- [ ] **Step 2: Delete the file**

```bash
git rm components/panels/panel-window.tsx
```

- [ ] **Step 3: Type check, lint, test**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(panels): remove unused PanelWindow wrapper"
```

---

### Task 2: Delete orphan `panels/compare-itinerary.tsx`

**Files:**
- Delete: `components/panels/compare-itinerary.tsx`

**Context:** This file has been superseded by `components/agent-ui/views/compare-itinerary-view.tsx`. The `view-registry.ts` already wires the view version; the panels version has no consumers.

- [ ] **Step 1: Confirm no consumers**

Run:
```bash
grep -rn "from.*panels/compare-itinerary\|panels/compare-itinerary'" components app lib hooks 2>/dev/null
```
Expected: no matches. (The `views/compare-itinerary-view.tsx` file is a separate file and should not appear.)

Also run:
```bash
grep -rn "import.*CompareItinerary[^V]" components app lib hooks 2>/dev/null
```
Expected: no matches (the legitimate consumer imports `CompareItineraryView`).

- [ ] **Step 2: Delete the file**

```bash
git rm components/panels/compare-itinerary.tsx
```

- [ ] **Step 3: Type check, lint, test**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(panels): remove legacy CompareItinerary panel (superseded by view)"
```

---

### Task 3: Move map-domain files into `panels/map/`

**Files:**
- Move: `components/panels/panel-map.tsx` → `components/panels/map/panel-map.tsx`
- Move: `components/panels/map-canvas.tsx` → `components/panels/map/map-canvas.tsx`
- Move: `components/panels/city-card.tsx` → `components/panels/map/city-card.tsx`
- Move: `components/panels/city-card-layer.tsx` → `components/panels/map/city-card-layer.tsx`
- Modify: `components/panels/map/map-canvas.tsx` — internal import path
- Modify: `components/panels/map/city-card-layer.tsx` — internal import path
- Modify: `components/agent-ui/views/itinerary-view.tsx` — external import path
- Modify: `components/agent-ui/views/compare-itinerary-view.tsx` — external dynamic import path

- [ ] **Step 1: Create the target folder and move the files**

```bash
mkdir -p components/panels/map
git mv components/panels/panel-map.tsx components/panels/map/panel-map.tsx
git mv components/panels/map-canvas.tsx components/panels/map/map-canvas.tsx
git mv components/panels/city-card.tsx components/panels/map/city-card.tsx
git mv components/panels/city-card-layer.tsx components/panels/map/city-card-layer.tsx
```

- [ ] **Step 2: Update the internal import in `map-canvas.tsx`**

In `components/panels/map/map-canvas.tsx`, replace:
```ts
import { CityCardLayer } from '@/components/panels/city-card-layer';
```
with:
```ts
import { CityCardLayer } from '@/components/panels/map/city-card-layer';
```

- [ ] **Step 3: Update the internal import in `city-card-layer.tsx`**

In `components/panels/map/city-card-layer.tsx`, replace:
```ts
import { CITY_CARD_WIDTH, CityCard } from '@/components/panels/city-card';
```
with:
```ts
import { CITY_CARD_WIDTH, CityCard } from '@/components/panels/map/city-card';
```

- [ ] **Step 4: Update the external import in `itinerary-view.tsx`**

In `components/agent-ui/views/itinerary-view.tsx`, replace:
```ts
import { PanelMap } from '@/components/panels/panel-map';
```
with:
```ts
import { PanelMap } from '@/components/panels/map/panel-map';
```

- [ ] **Step 5: Update the dynamic import in `compare-itinerary-view.tsx`**

In `components/agent-ui/views/compare-itinerary-view.tsx`, replace:
```ts
const MapCanvas = dynamic(() => import('@/components/panels/map-canvas').then((m) => m.MapCanvas), {
```
with:
```ts
const MapCanvas = dynamic(() => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas), {
```

- [ ] **Step 6: Verify no stale references remain**

```bash
grep -rn "components/panels/panel-map\|components/panels/map-canvas\|components/panels/city-card" components app lib hooks 2>/dev/null
```
Expected: every match path includes `panels/map/` — no bare `panels/panel-map`, `panels/map-canvas`, or `panels/city-card*` (without the `/map/` segment) remains.

- [ ] **Step 7: Type check, lint, test**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 8: Commit**

```bash
git commit -m "refactor(panels): group map domain under panels/map/"
```

---

### Task 4: Move cabin-domain files into `panels/cabin/`

**Files:**
- Move: `components/panels/panel-cabin-selection.tsx` → `components/panels/cabin/panel-cabin-selection.tsx`
- Move: `components/panels/cabin-card.tsx` → `components/panels/cabin/cabin-card.tsx`
- Modify: `components/panels/cabin/panel-cabin-selection.tsx` — internal import path
- Modify: `components/agent-ui/views/cabin-selection-view.tsx` — external import path

- [ ] **Step 1: Create the target folder and move the files**

```bash
mkdir -p components/panels/cabin
git mv components/panels/panel-cabin-selection.tsx components/panels/cabin/panel-cabin-selection.tsx
git mv components/panels/cabin-card.tsx components/panels/cabin/cabin-card.tsx
```

- [ ] **Step 2: Update the internal import in `panel-cabin-selection.tsx`**

In `components/panels/cabin/panel-cabin-selection.tsx`, replace:
```ts
import { CabinCard } from '@/components/panels/cabin-card';
```
with:
```ts
import { CabinCard } from '@/components/panels/cabin/cabin-card';
```

- [ ] **Step 3: Update the external import in `cabin-selection-view.tsx`**

In `components/agent-ui/views/cabin-selection-view.tsx`, replace:
```ts
import { PanelCabinSelection } from '@/components/panels/panel-cabin-selection';
```
with:
```ts
import { PanelCabinSelection } from '@/components/panels/cabin/panel-cabin-selection';
```

- [ ] **Step 4: Verify no stale references remain**

```bash
grep -rn "components/panels/panel-cabin-selection\|components/panels/cabin-card" components app lib hooks 2>/dev/null
```
Expected: every match path includes `panels/cabin/` — no bare `panels/panel-cabin-selection` or `panels/cabin-card` remains.

- [ ] **Step 5: Type check, lint, test**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(panels): group cabin domain under panels/cabin/"
```

---

### Task 5: Move dream-domain file into `panels/dream/`

**Files:**
- Move: `components/panels/panel-dream.tsx` → `components/panels/dream/panel-dream.tsx`
- Modify: `components/agent-ui/views/dream-stage-view.tsx` — external import path

- [ ] **Step 1: Create the target folder and move the file**

```bash
mkdir -p components/panels/dream
git mv components/panels/panel-dream.tsx components/panels/dream/panel-dream.tsx
```

- [ ] **Step 2: Update the external import in `dream-stage-view.tsx`**

In `components/agent-ui/views/dream-stage-view.tsx`, replace:
```ts
import { PanelDream } from '@/components/panels/panel-dream';
```
with:
```ts
import { PanelDream } from '@/components/panels/dream/panel-dream';
```

- [ ] **Step 3: Verify no stale references remain**

```bash
grep -rn "components/panels/panel-dream" components app lib hooks 2>/dev/null
```
Expected: every match path includes `panels/dream/` — no bare `panels/panel-dream` remains.

Also verify the top-level `components/panels/` no longer contains any `.tsx` files:
```bash
ls components/panels/*.tsx 2>/dev/null
```
Expected: "no matches found" (or empty output) — only subfolders should remain.

- [ ] **Step 4: Type check, lint, test**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(panels): group dream domain under panels/dream/"
```

---

### Task 6: Update `conventions/project-layout.md`

**Files:**
- Modify: `conventions/project-layout.md`

- [ ] **Step 1: Update the tree diagram**

In `conventions/project-layout.md`, replace the line:
```
│   ├── panels/           Reusable content panels (map, cabin cards, etc.)
```
with:
```
│   ├── panels/           Reusable content panels grouped by domain (map/, cabin/, dream/)
```

- [ ] **Step 2: Update the "Where to put a new file" table**

In the same file, replace the row:
```
| A reusable visual block (card, panel, chart) | `components/panels/` or a new folder under `components/`      |
```
with:
```
| A reusable visual block (card, panel, chart) | `components/panels/<domain>/` (create a new domain subfolder if none fits) |
```

- [ ] **Step 3: Verify the file still reads cleanly**

Run:
```bash
pnpm exec prettier --check conventions/project-layout.md
```
Expected: passes, or run `pnpm exec prettier --write conventions/project-layout.md` to fix formatting if it complains.

- [ ] **Step 4: Commit**

```bash
git add conventions/project-layout.md
git commit -m "docs(conventions): describe panels/ as per-domain layout"
```

---

### Task 7: Final verification & manual smoke

**Files:** None modified — verification only.

- [ ] **Step 1: Full repo grep for any stale `@/components/panels/<file>` references**

```bash
grep -rn "@/components/panels/[a-z-]*'" components app lib hooks 2>/dev/null
```
Expected: every match path is `@/components/panels/<domain>/<file>` (has two segments after `panels/`).

- [ ] **Step 2: Confirm panels/ shape matches the spec**

```bash
find components/panels -type f
```
Expected: exactly these seven files:
```
components/panels/map/panel-map.tsx
components/panels/map/map-canvas.tsx
components/panels/map/city-card.tsx
components/panels/map/city-card-layer.tsx
components/panels/cabin/panel-cabin-selection.tsx
components/panels/cabin/cabin-card.tsx
components/panels/dream/panel-dream.tsx
```

- [ ] **Step 3: Full verification suite**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```
Expected: all three commands exit 0.

- [ ] **Step 4: Manual smoke (ask the user)**

Tell the user the refactor is complete and ask them to start the dev server (`pnpm dev`) and click through:
- Start view
- Dream stage (trigger via mock or agent)
- Itinerary (panel-map)
- Cabin selection
- Compare itinerary (uses the dynamic `MapCanvas` import)

Do **not** launch Playwright or browser tools — the user has a standing preference to skip browser-based verification unless explicitly asked.

- [ ] **Step 5: No commit needed for this task** (verification only).
