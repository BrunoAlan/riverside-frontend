# Frontend Restructure & Boilerplate Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `components/`, `hooks/`, and `lib/` to eliminate the `components/app/` catch-all, normalize naming, and delete dead theming + ai-elements boilerplate — all without changing runtime behavior.

**Architecture:** Pure refactor. Five small, sequential commits, each verified by `pnpm lint && pnpm test && pnpm build` and targeted `git grep` checks. No new tests are written: existing vitest suites in `lib/` plus TypeScript + Next's build provide regression coverage, because no behavior changes (theming was never mounted; deleted ai-elements files had zero consumers; moves preserve module exports).

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, shadcn/ui, vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-19-frontend-restructure-design.md`

---

## File map

**Deletions:**
- `components/app/theme-provider.tsx`
- `components/app/theme-toggle.tsx`
- `components/ai-elements/message.tsx`
- `components/ai-elements/shimmer.tsx`
- `components/agent/` (after `agent-header.tsx` moves out)
- `components/app/agent-ui/dev/` (after both files move out)

**Edits in place:**
- `components/ui/sonner.tsx` — drop `useTheme`, set `theme="light"`
- `styles/globals.css` — remove `@custom-variant dark` (line 5), `TODO(design-system): remap dark mode` comment + `.dark { … }` block (around line 173+)
- `package.json` — remove `next-themes` dep, remove `scripts.shadcn:install`
- `README.md` — remove `components/agents-ui/` line
- `components/app/app.tsx` — update hook import paths after Task 3

**Moves (`git mv`):**
- `hooks/useAgentErrors.tsx` → `hooks/use-agent-errors.tsx`
- `hooks/useDebug.ts` → `hooks/use-debug.ts`
- `components/app/agent-ui/` → `components/agent-ui/`
- `components/app/content-panels/` → `components/panels/`
- `components/agent/agent-header.tsx` → `components/agent-ui/agent-header.tsx`
- `components/agent-ui/dev/dev-panel.tsx` → `lib/dev/dev-panel.tsx`
- `components/agent-ui/dev/mocks.ts` → `lib/dev/mocks.ts`
- `components/app/` → `components/layout/` (last commit, after `agent-ui/` and `content-panels/` have already left)

---

## Working directory

All commands assume cwd `/Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-frontend`.

---

## Task 1: Theming cleanup

**Files:**
- Delete: `components/app/theme-provider.tsx`
- Delete: `components/app/theme-toggle.tsx`
- Modify: `components/ui/sonner.tsx`
- Modify: `styles/globals.css`
- Modify: `package.json`

Theming code was never mounted (`ThemeProvider`/`ThemeToggle` have zero JSX usage; verified with `grep -r "<ThemeProvider\|<ThemeToggle"`). Deleting it cannot regress visual behavior.

- [ ] **Step 1: Confirm theming is unmounted**

Run:
```bash
grep -rE "<ThemeProvider|<ThemeToggle" --include="*.tsx" . | grep -v node_modules
```
Expected: no output (zero JSX usages).

- [ ] **Step 2: Delete the two theming components**

Run:
```bash
git rm components/app/theme-provider.tsx components/app/theme-toggle.tsx
```

- [ ] **Step 3: Replace `useTheme()` in sonner.tsx with fixed `theme="light"`**

Edit `components/ui/sonner.tsx` so the file reads exactly:

```tsx
'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',

          '--success-bg': 'var(--success-50)',
          '--success-text': 'var(--neutral-900)',
          '--success-border': 'var(--success-200)',

          '--info-bg': 'var(--neutral-100)',
          '--info-text': 'var(--neutral-900)',
          '--info-border': 'var(--neutral-200)',

          '--warning-bg': 'var(--warning-50)',
          '--warning-text': 'var(--neutral-900)',
          '--warning-border': 'var(--warning-200)',

          '--error-bg': 'var(--error-50)',
          '--error-text': 'var(--neutral-900)',
          '--error-border': 'var(--error-200)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
```

(Two changes vs. before: removed `import { useTheme } from 'next-themes';` and the `const { theme = 'system' } = useTheme();` line; replaced `theme={theme as ToasterProps['theme']}` with `theme="light"`.)

- [ ] **Step 4: Remove `@custom-variant dark` from globals.css**

Edit `styles/globals.css`: delete line 5 exactly:
```css
@custom-variant dark (&:is(.dark *));
```
(Leave the surrounding blank line so the file still reads cleanly.)

- [ ] **Step 5: Remove the `.dark { … }` block and its TODO comment**

In `styles/globals.css`, find the block starting around line 173 with:
```css
/* TODO(design-system): remap dark mode to new raw palette (currently uses shadcn defaults). */
.dark {
  --background: oklch(0.145 0 0);
  ...
}
```
Delete the comment line AND the entire `.dark { … }` block (including its closing `}`). Do NOT touch `.ds-force-light` or its comment immediately above — those belong to the design-system showcase and remain.

- [ ] **Step 6: Remove `next-themes` dependency**

Run:
```bash
pnpm remove next-themes
```
Expected: `package.json` no longer lists `next-themes`; `pnpm-lock.yaml` updated.

- [ ] **Step 7: Verify nothing still imports next-themes or the deleted files**

Run:
```bash
git grep -nE "next-themes|theme-provider|theme-toggle|ThemeProvider|ThemeToggle"
```
Expected: no output.

- [ ] **Step 8: Run lint, tests, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all green. If `pnpm build` complains about a stale `.dark` reference, you missed an occurrence in Step 5.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove unused theming (next-themes, ThemeProvider/Toggle, .dark tokens)"
```

---

## Task 2: Delete orphan ai-elements + aspirational shadcn:install script

**Files:**
- Delete: `components/ai-elements/message.tsx`
- Delete: `components/ai-elements/shimmer.tsx`
- Modify: `package.json`
- Modify: `README.md`

Both `.tsx` files have zero importers (verified with `grep -rE "from ['\"].*ai-elements/(message|shimmer)"`). The `shadcn:install` script lists 14 `@agents-ui/*` registry components that were never actually installed (no `components/agents-ui/` folder exists, no imports anywhere).

- [ ] **Step 1: Confirm zero consumers**

Run:
```bash
grep -rE "ai-elements/(message|shimmer)" --include="*.tsx" --include="*.ts" . | grep -v node_modules
```
Expected: only the files themselves (or no output).

- [ ] **Step 2: Delete the two files**

Run:
```bash
git rm components/ai-elements/message.tsx components/ai-elements/shimmer.tsx
```

- [ ] **Step 3: Remove `scripts.shadcn:install` from package.json**

Edit `package.json`. Inside `"scripts"`, delete the entire `"shadcn:install": "..."` line (and trim the trailing comma on the preceding line if needed so the JSON stays valid). The remaining scripts are: `dev`, `build`, `start`, `lint`, `test`, `format`, `format:check`.

- [ ] **Step 4: Validate package.json is still valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"
```
Expected: `ok`.

- [ ] **Step 5: Remove `components/agents-ui/` mention from README.md**

In `README.md`, find the line under the "Project structure" tree that reads (approximately):
```
│   ├── agents-ui/        - LiveKit Agents UI components (do not rename)
```
Delete that line. Leave surrounding lines intact.

- [ ] **Step 6: Run lint, tests, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: drop orphan ai-elements (message, shimmer) and aspirational shadcn:install script"
```

---

## Task 3: Rename hooks to kebab-case

**Files:**
- Move: `hooks/useAgentErrors.tsx` → `hooks/use-agent-errors.tsx`
- Move: `hooks/useDebug.ts` → `hooks/use-debug.ts`
- Modify: `components/app/app.tsx`

These are the only two files in `hooks/` and the only camelCase outliers. Sole consumer is `components/app/app.tsx`.

- [ ] **Step 1: Move the files**

Run:
```bash
git mv hooks/useAgentErrors.tsx hooks/use-agent-errors.tsx
git mv hooks/useDebug.ts hooks/use-debug.ts
```

- [ ] **Step 2: Update imports in `components/app/app.tsx`**

In `components/app/app.tsx`, replace:
```ts
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
```
With:
```ts
import { useAgentErrors } from '@/hooks/use-agent-errors';
import { useDebugMode } from '@/hooks/use-debug';
```
(The named exports `useAgentErrors` and `useDebugMode` are unchanged — only file paths shift.)

- [ ] **Step 3: Verify no stale references**

Run:
```bash
git grep -nE "hooks/useAgentErrors|hooks/useDebug"
```
Expected: no output.

- [ ] **Step 4: Run lint, tests, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(hooks): rename to kebab-case (use-agent-errors, use-debug)"
```

---

## Task 4: Promote `agent-ui/` and `panels/` out of `components/app/`

**Files (moves):**
- `components/app/agent-ui/` → `components/agent-ui/`
- `components/app/content-panels/` → `components/panels/`
- `components/agent/agent-header.tsx` → `components/agent-ui/agent-header.tsx`
- `components/agent-ui/dev/dev-panel.tsx` → `lib/dev/dev-panel.tsx`
- `components/agent-ui/dev/mocks.ts` → `lib/dev/mocks.ts`

**Files (import rewrites — exact lines):**
- `app/agent/layout.tsx:1`
- `components/app/app.tsx:7`
- `components/app/view-controller.tsx:4`
- `components/panels/map-canvas.tsx:6` (new path after move)
- `components/panels/panel-map.tsx:5`
- `components/panels/panel-window.tsx:1` (unchanged — still imports `window-background` from `components/app/`)
- `components/panels/city-card-layer.tsx:6`
- `components/panels/panel-cabin-selection.tsx:4`
- `components/panels/compare-itinerary.tsx:5`
- `components/agent-ui/views/compare-itinerary-view.tsx:5`
- `components/agent-ui/views/start-view.tsx:4-5` (`app-config-context`, `welcome-view` stay in `components/app/` until Task 5)
- `components/agent-ui/views/itinerary-view.tsx:3`
- `components/agent-ui/views/cabin-selection-view.tsx:3`
- `components/agent-ui/views/dream-stage-view.tsx:3`

After this task, `components/app/` will contain only the shell-layer files (`app.tsx`, `app-config-context.tsx`, `view-controller.tsx`, `welcome-view.tsx`, `window-background.tsx`). Renaming `components/app/` → `components/layout/` is deferred to Task 5 to keep this commit's diff focused.

- [ ] **Step 1: Move the agent-ui and content-panels directories**

Run:
```bash
git mv components/app/agent-ui components/agent-ui
git mv components/app/content-panels components/panels
```

- [ ] **Step 2: Move agent-header into agent-ui and remove empty agent dir**

Run:
```bash
git mv components/agent/agent-header.tsx components/agent-ui/agent-header.tsx
rmdir components/agent
```

- [ ] **Step 3: Move dev-panel and mocks into lib/dev**

Run:
```bash
mkdir -p lib/dev
git mv components/agent-ui/dev/dev-panel.tsx lib/dev/dev-panel.tsx
git mv components/agent-ui/dev/mocks.ts lib/dev/mocks.ts
rmdir components/agent-ui/dev
```

(The `import { VIEW_MOCKS } from './mocks';` line inside `dev-panel.tsx` keeps working — both files moved together.)

- [ ] **Step 4: Rewrite alias imports across the repo**

Run the four `sed` replacements (BSD sed on macOS — note the `''` after `-i`; `xargs -I{}` makes it a no-op when grep finds nothing):

Important: run sed #4 (`dev-panel` → `lib/dev/dev-panel`) BEFORE sed #1, because sed #1 rewrites `components/app/agent-ui/` to `components/agent-ui/`, which would change the path sed #4 needs to find.

```bash
# 1. dev-panel → lib/dev (must run before the broad agent-ui rewrite)
grep -rlE "@/components/app/agent-ui/dev/dev-panel" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | xargs -I{} sed -i '' 's|@/components/app/agent-ui/dev/dev-panel|@/lib/dev/dev-panel|g' {}

# 2. agent-ui dir promoted
grep -rlE "@/components/app/agent-ui/" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | xargs -I{} sed -i '' 's|@/components/app/agent-ui/|@/components/agent-ui/|g' {}

# 3. content-panels → panels
grep -rlE "@/components/app/content-panels/" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | xargs -I{} sed -i '' 's|@/components/app/content-panels/|@/components/panels/|g' {}

# 4. agent-header into agent-ui
grep -rlE "@/components/agent/agent-header" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | xargs -I{} sed -i '' 's|@/components/agent/agent-header|@/components/agent-ui/agent-header|g' {}
```

- [ ] **Step 5: Verify no stale paths remain**

Run:
```bash
git grep -nE "@/components/app/(agent-ui|content-panels)/|@/components/agent/agent-header|@/components/agent-ui/dev/"
```
Expected: no output.

- [ ] **Step 6: Sanity-check internal relative imports inside moved trees**

Run:
```bash
git grep -nE "from '\\./|from '\\.\\./" components/agent-ui components/panels lib/dev
```
Expected: paths still resolve (no `../app/...` style references, since moves preserved sibling relationships within each tree).

- [ ] **Step 7: Run lint, tests, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all green. If `next build` complains about an unresolved module, re-run Step 5's grep to find missed imports.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: promote agent-ui/ and panels/ out of components/app/

- components/app/agent-ui/  -> components/agent-ui/
- components/app/content-panels/ -> components/panels/
- components/agent/agent-header.tsx -> components/agent-ui/
- components/app/agent-ui/dev/ -> lib/dev/"
```

---

## Task 5: Rename `components/app/` → `components/layout/`

**Files (moves):**
- `components/app/` → `components/layout/` (5 surviving files: `app.tsx`, `app-config-context.tsx`, `view-controller.tsx`, `welcome-view.tsx`, `window-background.tsx`)

**Files (import rewrites):**
- `app/agent/page.tsx:2` (`@/components/app/app` → `@/components/layout/app`)
- `components/layout/app.tsx` (its own imports of `@/components/app/app-config-context`, `@/components/app/view-controller` — both shift to `@/components/layout/...`)
- `components/layout/view-controller.tsx` (`@/components/app/window-background` → `@/components/layout/window-background`)
- `components/panels/panel-window.tsx` (`@/components/app/window-background` → `@/components/layout/window-background`)
- `components/agent-ui/views/start-view.tsx` (`@/components/app/app-config-context`, `@/components/app/welcome-view` → `@/components/layout/...`)

- [ ] **Step 1: Move the directory**

Run:
```bash
git mv components/app components/layout
```

- [ ] **Step 2: Rewrite alias imports**

```bash
grep -rlE "@/components/app/" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | xargs -I{} sed -i '' 's|@/components/app/|@/components/layout/|g' {}
```

- [ ] **Step 3: Verify zero remaining references**

Run:
```bash
git grep -nE "@/components/app(/|\")"
```
Expected: no output.

Also verify the directory is gone:
```bash
test ! -d components/app && echo "ok"
```
Expected: `ok`.

- [ ] **Step 4: Run lint, tests, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all green.

- [ ] **Step 5: Manual smoke test in the browser**

Run:
```bash
pnpm dev
```
Open the app, exercise:
- Agent route loads (`/agent` or wherever `app/agent/page.tsx` mounts).
- Voice session connects (LiveKit `StartAudioButton` works).
- Chat panel renders messages.
- At least one agent-ui view transitions (e.g. `start` → `dream_stage` → `itinerary`) — easiest via the dev panel.
- No console errors related to missing modules or undefined theme.

Stop the dev server when satisfied.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename components/app/ to components/layout/"
```

---

## Post-implementation verification

After all five commits:

```bash
# No stale paths anywhere
git grep -nE "components/app/|hooks/useAgentErrors|hooks/useDebug\.ts|next-themes|theme-provider|theme-toggle|ai-elements/(message|shimmer)"
# Expected: no output

# Full pipeline
pnpm lint && pnpm test && pnpm build
# Expected: all green

# Optional: confirm no dependency surprises
pnpm install --frozen-lockfile
```

---

## Out of scope (do NOT do as part of this plan)

- Auditing `@radix-ui/*` for orphans freed by deletions.
- Introducing barrel `index.ts` files.
- Touching anything inside `components/ui/`, `components/livekit/`, `components/chat/`, or `components/home/`.
- Removing `components/ui/button-group.tsx` even though Task 2 makes it orphan-of-product (user policy: keep all shadcn base primitives).
- Refactoring inside any moved file — moves only.
