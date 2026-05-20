# Panels by domain — design

**Date:** 2026-05-20
**Status:** Approved (pending implementation plan)

## Problem

`components/panels/` is a flat folder mixing three kinds of files:

- Panel containers (one per agent view): `panel-map.tsx`, `panel-cabin-selection.tsx`, `panel-dream.tsx`.
- Visual primitives used inside panels: `map-canvas.tsx`, `city-card.tsx`, `city-card-layer.tsx`, `cabin-card.tsx`.
- Two orphan files with no consumers: `panel-window.tsx`, `compare-itinerary.tsx`.

The flat layout hides which primitives belong to which panel, and the orphans add noise. As more domains land under `panels/`, the mix gets worse.

## Goal

Group files in `components/panels/` by visual domain (map, cabin, dream) so that things that change together live together, and remove the orphan files. No file renames, no behavior changes.

## Target structure

```
components/panels/
├── map/
│   ├── panel-map.tsx
│   ├── map-canvas.tsx
│   ├── city-card.tsx
│   └── city-card-layer.tsx
├── cabin/
│   ├── panel-cabin-selection.tsx
│   └── cabin-card.tsx
└── dream/
    └── panel-dream.tsx
```

### Files removed

- `components/panels/panel-window.tsx` — 5-line wrapper over `WindowBackground`; `grep` finds no importers.
- `components/panels/compare-itinerary.tsx` — superseded by `components/agent-ui/views/compare-itinerary-view.tsx`; no importers.

### Files moved (path only, names unchanged)

| From                                            | To                                                  |
| ----------------------------------------------- | --------------------------------------------------- |
| `components/panels/panel-map.tsx`               | `components/panels/map/panel-map.tsx`               |
| `components/panels/map-canvas.tsx`              | `components/panels/map/map-canvas.tsx`              |
| `components/panels/city-card.tsx`               | `components/panels/map/city-card.tsx`               |
| `components/panels/city-card-layer.tsx`         | `components/panels/map/city-card-layer.tsx`         |
| `components/panels/panel-cabin-selection.tsx`   | `components/panels/cabin/panel-cabin-selection.tsx` |
| `components/panels/cabin-card.tsx`              | `components/panels/cabin/cabin-card.tsx`            |
| `components/panels/panel-dream.tsx`             | `components/panels/dream/panel-dream.tsx`           |

## Import updates

### Internal to `components/panels/`

- `map/map-canvas.tsx` imports `city-card-layer` → update to `@/components/panels/map/city-card-layer`.
- `map/city-card-layer.tsx` imports `city-card` → update to `@/components/panels/map/city-card`.
- `cabin/panel-cabin-selection.tsx` imports `cabin-card` → update to `@/components/panels/cabin/cabin-card`.

### External (agent-ui views)

- `components/agent-ui/views/itinerary-view.tsx` → `@/components/panels/map/panel-map`.
- `components/agent-ui/views/cabin-selection-view.tsx` → `@/components/panels/cabin/panel-cabin-selection`.
- `components/agent-ui/views/dream-stage-view.tsx` → `@/components/panels/dream/panel-dream`.
- `components/agent-ui/views/compare-itinerary-view.tsx` — `dynamic(import('@/components/panels/map-canvas'))` → `@/components/panels/map/map-canvas`.

A full repo grep for `@/components/panels/` and `from '../panels` confirms these are the only external touchpoints.

## Conventions update

Edit `conventions/project-layout.md`:

1. In the tree diagram, replace the `panels/` entry with:
   ```
   ├── panels/              Reusable content panels grouped by domain (map/, cabin/, dream/)
   ```
2. In the "Where to put a new file" table, update the panel row to:
   `components/panels/<domain>/` — create the subfolder when introducing a new domain.

No other convention files need changes.

## Verification

- `pnpm tsc --noEmit` (or `pnpm typecheck`) — no errors.
- `pnpm lint` — clean.
- `pnpm test` — green.
- Manual smoke of the app shell: start view, dream stage, itinerary, cabin selection, compare itinerary all render. No browser-based visual verification (per user preference).

## Out of scope

- `components/agent-ui/views/` reshape.
- File renames (e.g. dropping the `panel-` prefix once nested).
- Moving `compare-itinerary-view` or its `MapCanvas` usage out of `views/`.
- Any logic, styling, or props changes.
- Touching `chat/`, `home/`, `layout/`, `livekit/`, `ai-elements/`.

## Risks

- A dynamic `import()` string that grep missed. Mitigation: type-check + lint + manual smoke covers it.
- Future panels in domains that don't fit map/cabin/dream. Mitigation: the convention says "create a new subfolder for a new domain" — no ceiling.
