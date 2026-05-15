# Welcome Window Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/agent` welcome screen so a looping window video, framed by a hand-drawn room overlay, sits behind a styled "Welcome Aboard" card.

**Architecture:** Two `fixed inset-0` full-bleed `object-cover` layers — a `<video>` and the overlay `<Image>` — share the same ~16:9 aspect ratio so they crop identically and stay aligned. A new `WindowBackground` component renders both; `ViewController` mounts it only in the pre-connection state. `WelcomeView` is restyled into the mockup card.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, `@phosphor-icons/react`, `motion/react`.

**Note:** This project has no test runner. Verification is done with `pnpm lint` and `pnpm exec tsc --noEmit`. Visual verification is a manual step for the user.

---

## File Structure

- **Create** `components/app/window-background.tsx` — the two-layer video + overlay background.
- **Modify** `components/app/welcome-view.tsx` — restyle into the mockup card.
- **Modify** `components/app/view-controller.tsx` — render `WindowBackground` while `!isConnected`.
- **Modify** `app-config.ts` — change `startButtonText` default.

---

### Task 1: Update `startButtonText` default

**Files:**
- Modify: `app-config.ts:49`

- [ ] **Step 1: Change the default button text**

In `app-config.ts`, inside `APP_CONFIG_DEFAULTS`, change line 49:

```ts
  startButtonText: 'Start the experience',
```

(was `startButtonText: 'Start call',`)

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm exec tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add app-config.ts
git commit -m "chore(config): set welcome button text to 'Start the experience'"
```

---

### Task 2: Create the `WindowBackground` component

**Files:**
- Create: `components/app/window-background.tsx`

- [ ] **Step 1: Create the component file**

Create `components/app/window-background.tsx` with this exact content:

```tsx
'use client';

import Image from 'next/image';

export function WindowBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/window-video.mp4" type="video/mp4" />
      </video>
      <Image
        src="/window-overlay.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
    </div>
  );
}
```

Notes:
- `'use client'` is required — the `<video>` autoplay element must render client-side.
- `-z-10` keeps the background behind the card (the card has no explicit z-index, so it sits at the default `z-0` stacking level above `-z-10`).
- `pointer-events-none` so the background never intercepts clicks.

- [ ] **Step 2: Verify lint and typecheck pass**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors, exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/app/window-background.tsx
git commit -m "feat(welcome): add window video background component"
```

---

### Task 3: Restyle `WelcomeView` into the mockup card

**Files:**
- Modify: `components/app/welcome-view.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `components/app/welcome-view.tsx` with:

```tsx
import { Microphone, SpeakerHigh } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="flex items-center justify-center p-6">
      <section className="bg-beige-50 flex w-full max-w-md flex-col items-center rounded-2xl px-8 py-10 text-center shadow-xl">
        <div className="text-fg0 mb-6 flex items-center gap-4">
          <Microphone size={22} weight="regular" />
          <SpeakerHigh size={22} weight="regular" />
        </div>

        <h1 className="text-foreground text-2xl font-medium">Welcome Aboard</h1>

        <p className="text-muted-foreground mt-3 max-w-prose leading-6">
          Please grant the concierge permission to use your microphone and play
          sound.
        </p>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-7 rounded-full px-8"
        >
          {startButtonText}
        </Button>
      </section>
    </div>
  );
};
```

Notes:
- The `WelcomeImage` SVG and its usage are removed.
- `WelcomeViewProps` interface is unchanged — `ViewController` needs no edits for props.
- Phosphor icons are imported from the `/dist/ssr` entry (this component is not a client component; the `ssr` entry renders without `'use client'`).
- The icons are decorative only — no permission API calls.
- `bg-beige-50` is `#FBF9F8` ("Surface/Card"), defined in `styles/globals.css`.

- [ ] **Step 2: Verify lint and typecheck pass**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors, exit 0.

If `tsc` reports the Phosphor `/dist/ssr` import path is not found, change the import to `from '@phosphor-icons/react'` instead and add `'use client';` as the first line of the file.

- [ ] **Step 3: Commit**

```bash
git add components/app/welcome-view.tsx
git commit -m "feat(welcome): restyle welcome view as Welcome Aboard card"
```

---

### Task 4: Mount `WindowBackground` in `ViewController`

**Files:**
- Modify: `components/app/view-controller.tsx`

- [ ] **Step 1: Add the import**

In `components/app/view-controller.tsx`, after the existing `WelcomeView` import (line 8), add:

```tsx
import { WindowBackground } from '@/components/app/window-background';
```

- [ ] **Step 2: Render the background in the welcome state**

In the `return` block, change the welcome-view branch so the background renders
alongside the card while `!isConnected`. Replace:

```tsx
      {/* Welcome view */}
      {!isConnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={start}
        />
      )}
```

with:

```tsx
      {/* Welcome view */}
      {!isConnected && <WindowBackground key="window-background" />}
      {!isConnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={start}
        />
      )}
```

Note: `WindowBackground` is a direct child of `AnimatePresence` but is not a
`motion` component — it simply mounts/unmounts with the welcome state. The card
keeps its existing fade. This is acceptable; the background appears/disappears
instantly while the card fades.

- [ ] **Step 3: Verify lint and typecheck pass**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors, exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/app/view-controller.tsx
git commit -m "feat(welcome): show window background in pre-connection state"
```

---

### Task 5: Manual visual verification

**Files:** none

- [ ] **Step 1: Run the dev server and verify**

Run: `pnpm dev`, open `/agent` in a browser, and confirm:
- The window video plays (muted, looping) through the overlay's window cutout.
- The hand-drawn room overlay frames the screen, cropping at the edges on
  narrow widths (`cover` behavior).
- The "Welcome Aboard" card is centered with the `#FBF9F8` background, mic and
  speaker icons, heading, body text, and rounded button.
- Clicking the button connects the session; the window background unmounts when
  the session view appears.

This step has no commit.

---

## Self-Review

**Spec coverage:**
- Two-layer cover background → Task 2. ✓
- `WindowBackground` client component → Task 2. ✓
- `WelcomeView` redesign (card, icons, copy, button) → Task 3. ✓
- `bg-beige-50` / #FBF9F8 card → Task 3. ✓
- Mount only while `!isConnected` → Task 4. ✓
- `startButtonText` default change → Task 1. ✓
- Out-of-scope items (no `getUserMedia`, no session-view changes) → respected. ✓

**Placeholder scan:** No TBDs or vague steps; all code shown in full.

**Type consistency:** `WelcomeViewProps` unchanged across Task 3; `WindowBackground` exported and imported with matching name in Tasks 2 and 4.
