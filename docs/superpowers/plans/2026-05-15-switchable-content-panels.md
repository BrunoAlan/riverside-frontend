# Switchable Content Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the conversation starts, replace the video/`WindowBackground` with a content area whose panel is switchable from a dropdown in the UI.

**Architecture:** A registry lists placeholder panels (`{ id, label, component }`). `ContentView` holds the active-panel state, renders a shadcn `Select` from the registry, and renders the active panel. `ViewController` renders `WindowBackground` + `WelcomeView` before start, and `ContentView` only after start.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, motion/react.

**Note on testing:** This project has no test framework (`package.json` has no test deps) and the work is UI mocking. Verification per task is `pnpm lint` + `pnpm exec tsc --noEmit`. No automated tests are added — that would be out of scope.

---

### Task 1: Placeholder panels and registry

**Files:**
- Create: `components/app/content-panels/panel-a.tsx`
- Create: `components/app/content-panels/panel-b.tsx`
- Create: `components/app/content-panels/panel-c.tsx`
- Create: `components/app/content-panels/registry.ts`

- [ ] **Step 1: Create `panel-a.tsx`**

```tsx
export function PanelA() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-lg">Contenido A</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `panel-b.tsx`**

```tsx
export function PanelB() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-lg">Contenido B</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `panel-c.tsx`**

```tsx
export function PanelC() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-lg">Contenido C</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `registry.ts`**

```ts
import type { ComponentType } from 'react';
import { PanelA } from '@/components/app/content-panels/panel-a';
import { PanelB } from '@/components/app/content-panels/panel-b';
import { PanelC } from '@/components/app/content-panels/panel-c';

export interface ContentPanel {
  id: string;
  label: string;
  component: ComponentType;
}

export const CONTENT_PANELS: ContentPanel[] = [
  { id: 'panel-a', label: 'Contenido A', component: PanelA },
  { id: 'panel-b', label: 'Contenido B', component: PanelB },
  { id: 'panel-c', label: 'Contenido C', component: PanelC },
];
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/app/content-panels
git commit -m "feat(content): add placeholder panels and registry"
```

---

### Task 2: ContentView with dropdown selector

**Files:**
- Create: `components/app/content-view.tsx`

- [ ] **Step 1: Create `content-view.tsx`**

The dropdown sits in a discreet top bar; the active panel fills the area below.
Default active panel is the first registry entry.

```tsx
'use client';

import { useState } from 'react';
import { CONTENT_PANELS } from '@/components/app/content-panels/registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const ContentView = ({ ref }: React.ComponentProps<'div'>) => {
  const [activeId, setActiveId] = useState(CONTENT_PANELS[0].id);

  const activePanel =
    CONTENT_PANELS.find((panel) => panel.id === activeId) ?? CONTENT_PANELS[0];
  const ActivePanel = activePanel.component;

  return (
    <div ref={ref} className="relative z-10 flex h-svh flex-col">
      <div className="flex justify-end p-4">
        <Select value={activeId} onValueChange={setActiveId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_PANELS.map((panel) => (
              <SelectItem key={panel.id} value={panel.id}>
                {panel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <ActivePanel />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/content-view.tsx
git commit -m "feat(content): add ContentView with panel selector"
```

---

### Task 3: Wire ContentView into ViewController

**Files:**
- Modify: `components/app/view-controller.tsx`

- [ ] **Step 1: Replace the render branch**

After start, render `ContentView` instead of leaving `WindowBackground` visible.
`WindowBackground` is only rendered while `!started`.

Replace the entire file body with:

```tsx
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ContentView } from '@/components/app/content-view';
import { WelcomeView } from '@/components/app/welcome-view';
import { WindowBackground } from '@/components/app/window-background';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionContentView = motion.create(ContentView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { start } = useSessionContext();
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
    start();
  };

  return (
    <>
      {!started && <WindowBackground isPlaying={false} />}
      <AnimatePresence mode="wait">
        {!started ? (
          <MotionWelcomeView
            key="welcome"
            {...VIEW_MOTION_PROPS}
            startButtonText={appConfig.startButtonText}
            onStartCall={handleStart}
          />
        ) : (
          <MotionContentView key="content" {...VIEW_MOTION_PROPS} />
        )}
      </AnimatePresence>
    </>
  );
}
```

Note: `WindowBackground` previously used `isPlaying={started}` to drive video
playback. Since it now only renders while `!started`, the video never plays —
pass `isPlaying={false}`. (If the welcome screen should still show a playing
video loop, change this to `isPlaying` of a separate always-on value — but per
the spec the video is being removed, so `false` is correct.)

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/view-controller.tsx
git commit -m "feat(content): show ContentView after session start"
```

---

## Self-Review Notes

- **Spec coverage:** flow (Task 3), `content-view.tsx` (Task 2), `content-panels/` placeholders (Task 1), registry (Task 1), shadcn `Select` selector (Task 2), `ViewController` changes (Task 3). All covered.
- **Type consistency:** `ContentPanel` / `CONTENT_PANELS` used consistently across Tasks 1–2. `ContentView` exported as a `ref`-accepting component so `motion.create` works, matching the `WelcomeView` pattern.
- **Out of scope:** real panel designs, linking panels to session state — not included, per spec.
