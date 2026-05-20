# Frontend Restructure & Boilerplate Cleanup

**Date:** 2026-05-19
**Status:** Approved, pending implementation plan

## Goal

Reorganize the frontend's directory and component structure following a "layer-based pulido" approach: keep the existing `components/` / `hooks/` / `lib/` separation but eliminate the `components/app/` catch-all, normalize naming conventions, and delete dead boilerplate (theming, unused `ai-elements`, aspirational shadcn install script).

Non-goals: introducing a `features/` layer, adding barrels, auditing `@radix-ui/*` deps, touching `components/ui/`, `livekit/`, `chat/`, `home/`, or the design-system showcase.

## Pain points addressed

1. `components/app/` is a catch-all (shell + content panels + agent-ui views).
2. `lib/agent-ui/` vs `components/app/agent-ui/` looks like duplication (it is not — logic vs views — but the nesting hides it).
3. Inconsistent hook naming (`useAgentErrors.tsx` / `useDebug.ts` vs kebab-case everywhere else).
4. Dev-only assets (mocks, dev panel) live inside `components/`.
5. Dead theming code (`ThemeProvider` / `ThemeToggle` never mounted).
6. Orphan `ai-elements` components (`message.tsx`, `shimmer.tsx`).
7. `package.json` `shadcn:install` script lists 14 `@agents-ui/*` registry components that were never installed.

## Target structure

```
components/
├── ui/                     # shadcn primitives — unchanged
├── layout/                 # ← renamed from components/app/
│   ├── app.tsx
│   ├── app-config-context.tsx
│   ├── view-controller.tsx
│   ├── welcome-view.tsx
│   └── window-background.tsx
├── agent-ui/               # ← promoted from components/app/agent-ui/
│   ├── content-view.tsx
│   ├── fallback-view.tsx
│   ├── hint-overlay.tsx
│   ├── view-registry.ts
│   ├── agent-header.tsx    # ← moved from components/agent/ (only real consumer is here)
│   └── views/
│       ├── start-view.tsx
│       ├── dream-stage-view.tsx
│       ├── cabin-selection-view.tsx
│       ├── itinerary-view.tsx
│       ├── compare-itinerary-view.tsx
│       └── presentation-view.tsx
├── panels/                 # ← promoted from components/app/content-panels/
│   ├── map-canvas.tsx
│   ├── panel-map.tsx
│   ├── panel-dream.tsx
│   ├── panel-cabin-selection.tsx
│   ├── panel-window.tsx
│   ├── compare-itinerary.tsx
│   ├── city-card.tsx
│   ├── city-card-layer.tsx
│   └── cabin-card.tsx
├── chat/                   # unchanged
├── home/                   # unchanged
├── livekit/                # unchanged
└── ai-elements/
    └── conversation.tsx    # only surviving file (message.tsx + shimmer.tsx deleted)

hooks/
├── use-agent-errors.tsx    # ← renamed from useAgentErrors.tsx
└── use-debug.ts            # ← renamed from useDebug.ts

lib/
├── agent-ui/               # logic (transport, store, commands, types, hooks) — unchanged
├── dev/
│   ├── dev-panel.tsx       # ← moved from components/app/agent-ui/dev/
│   └── mocks.ts            # ← moved from components/app/agent-ui/dev/ (dev-panel fixtures, not vitest mocks)
├── map/                    # unchanged
├── shadcn/                 # unchanged
├── cabins.ts, cabins.test.ts, utils.ts
```

## Conventions

- Folders and files in `kebab-case` (already dominant; only the two hooks deviate).
- Tests co-located: `*.test.ts` next to the file under test (existing convention).
- Mocks and dev-only code live under `lib/`, not `components/`.
- No barrel `index.ts` files. Imports use the `@/` alias explicitly.

## Naming rationale

- `layout/` — collects components that compose the app's React layout (root provider, view controller, welcome view, window background). Conceptually distinct from Next's `app/layout.tsx` route file, which is fine.
- `agent-ui/` (under `components/`) is the visual layer; `lib/agent-ui/` is the logic layer. The shared `agent-ui` name stops being confusing once neither lives nested inside `app/`.

## Dead code to delete

### Theming (never mounted)
- `components/app/theme-provider.tsx`
- `components/app/theme-toggle.tsx`
- `next-themes` dependency (`pnpm remove next-themes`)
- `components/ui/sonner.tsx`: replace `useTheme()` with fixed `theme="light"`
- `styles/globals.css`:
  - line 5: `@custom-variant dark (&:is(.dark *));`
  - line 144 area: "Force light tokens inside the design-system showcase…" comment (obsolete once `.dark` is gone)
  - line 174+: entire `.dark { … }` block

### Orphan ai-elements
- `components/ai-elements/message.tsx` (no consumers)
- `components/ai-elements/shimmer.tsx` (no consumers)

### Aspirational boilerplate
- `package.json` → remove `scripts.shadcn:install` (lists 14 `@agents-ui/*` components that were never installed; no `components/agents-ui/` folder exists)
- `README.md` → remove mention of `components/agents-ui/`

### Do NOT touch
- Any `.tsx` under `components/ui/` (even cascaded orphans like `button-group.tsx` stay — user wants base shadcn intact).
- `components/livekit/*` — all three files have real consumers (`chat.tsx`, `app.tsx`).
- `@livekit/components-react` — 7 distinct hooks in use across the codebase.
- `app/(design-system)/` route — kept as visual reference; keeps its consumers in `components/ui/` alive.

## Migration plan (5 small commits, each green)

Each commit: move/delete → fix imports → `pnpm lint && pnpm test && pnpm build` → commit.

### Commit 1 — Theming cleanup
- Delete `components/app/theme-provider.tsx`, `components/app/theme-toggle.tsx`.
- Edit `components/ui/sonner.tsx`: drop `useTheme`, set `theme="light"`.
- Edit `styles/globals.css`: remove `@custom-variant dark`, `.dark { … }` block, obsolete comment.
- `pnpm remove next-themes`.

### Commit 2 — Delete orphan ai-elements + aspirational script
- Delete `components/ai-elements/message.tsx`, `components/ai-elements/shimmer.tsx`.
- Remove `scripts.shadcn:install` from `package.json`.
- Remove `components/agents-ui/` mention from `README.md`.

### Commit 3 — Hook rename to kebab-case
- `git mv hooks/useAgentErrors.tsx hooks/use-agent-errors.tsx`
- `git mv hooks/useDebug.ts hooks/use-debug.ts`
- Update imports in `components/app/app.tsx` (only consumer).

### Commit 4 — Promote `agent-ui/` and `panels/` out of `components/app/`
- `git mv components/app/agent-ui components/agent-ui`
- `git mv components/app/content-panels components/panels`
- `git mv components/agent/agent-header.tsx components/agent-ui/agent-header.tsx` and remove empty `components/agent/`.
- `git mv components/agent-ui/dev/dev-panel.tsx lib/dev/dev-panel.tsx`
- `git mv components/agent-ui/dev/mocks.ts lib/dev/mocks.ts`
- Update `lib/dev/dev-panel.tsx` import of `./mocks` (path unchanged after move — both files travel together).
- Remove the now-empty `components/agent-ui/dev/`.
- Import rewrites:
  - `@/components/app/agent-ui/` → `@/components/agent-ui/`
  - `@/components/app/content-panels/` → `@/components/panels/`
  - `@/components/agent/agent-header` → `@/components/agent-ui/agent-header`
  - `@/components/app/agent-ui/dev/dev-panel` → `@/lib/dev/dev-panel`

### Commit 5 — Rename `components/app/` → `components/layout/`
- `git mv components/app components/layout`
- Import rewrite: `@/components/app/` → `@/components/layout/`.

## Verification

After each commit:
```
pnpm lint && pnpm test && pnpm build
```
If `tsc` or `next build` fails due to a broken import, fix before committing (never `--no-verify`).

After commit 5:
- `git grep "components/app/"` → 0 results
- `git grep "useAgentErrors\\|useDebug\\.ts"` → 0 results
- Manual smoke: load the app locally; confirm agent view + chat + map render unchanged.

## Out of scope (follow-up candidates)

- Audit `@radix-ui/*` for orphans freed by deletions (no file moves required).
- Introduce barrels if import noise warrants.
- Visit `components/livekit/`, `chat/`, `home/` for internal refactors.
