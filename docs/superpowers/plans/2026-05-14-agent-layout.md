# Agent Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared Next.js segment layout for `/agent/*` with a cream background and a decorative sage-green card containing the Riverside logo at the top.

**Architecture:** Two new files (`app/agent/layout.tsx` and `components/agent/agent-header.tsx`) plus one small edit to `components/app/welcome-view.tsx` to prevent the welcome card from painting white over the cream background. Layout is full-viewport height with no page scroll; content renders in a `flex-1` main element.

**Tech Stack:** Next.js 15 (App Router, server components), Tailwind v4 with CSS custom-property tokens (`--beige-200`, `--green-300`), `next/image`, existing `/public/riverside-logo.svg`.

**Spec:** `docs/superpowers/specs/2026-05-14-agent-layout-design.md`

**Testing model:** This codebase has no component test framework — verification is visual in the dev server, plus `pnpm lint` and `pnpm tsc --noEmit`. Each task ends with explicit verification steps and a commit.

---

## File Structure

- **Create:** `components/agent/agent-header.tsx` — decorative header (sage card + logo), server component, single responsibility.
- **Create:** `app/agent/layout.tsx` — Next.js segment layout, sets cream bg + fixed viewport height, renders `<AgentHeader />` above `{children}`.
- **Modify:** `components/app/welcome-view.tsx` — remove `bg-background` from the inner `<section>` so it inherits the layout's cream.

---

### Task 1: Create the AgentHeader component

**Files:**
- Create: `components/agent/agent-header.tsx`

- [ ] **Step 1: Create the component file**

Create `components/agent/agent-header.tsx` with this exact content:

```tsx
import Image from 'next/image';

export function AgentHeader() {
  return (
    <div className="flex justify-center pt-0">
      <div className="bg-green-300/50 px-8 py-4">
        <Image
          src="/riverside-logo.svg"
          alt="Riverside Luxury Cruises"
          width={100}
          height={110}
          priority
          className="h-[90px] w-auto"
        />
      </div>
    </div>
  );
}
```

Notes:
- Server component (no `'use client'`) — there is no interaction.
- No `<Link>` wrapper: spec defines the logo as decorative.
- The `bg-green-300/50` Tailwind class resolves to `--green-300` (`#cfd8d0`) at 50% opacity, matching the soft sage tone from the mockup.

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`
Expected: exits 0 with no errors referencing the new file.

- [ ] **Step 3: Commit**

```bash
git add components/agent/agent-header.tsx
git commit -m "feat(agent): add AgentHeader logo card component"
```

---

### Task 2: Create the /agent segment layout

**Files:**
- Create: `app/agent/layout.tsx`

- [ ] **Step 1: Create the layout file**

Create `app/agent/layout.tsx` with this exact content:

```tsx
import { AgentHeader } from '@/components/agent/agent-header';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <div className="bg-beige-200 flex h-screen flex-col">
      <AgentHeader />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

Notes:
- Server component by default — keep it that way.
- `h-screen flex flex-col` fixes the viewport; `min-h-0 flex-1 overflow-hidden` lets children own their own scroll (required for chat transcripts later) without leaking to the document.
- `bg-beige-200` is the cream the user selected from `styles/globals.css:24` (`#f3ede7`).
- Path alias `@/components/...` is the project convention — verified by other components.

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`
Expected: exits 0 with no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: exits 0 with no errors for the new files.

- [ ] **Step 4: Commit**

```bash
git add app/agent/layout.tsx
git commit -m "feat(agent): add /agent segment layout with cream background"
```

---

### Task 3: Strip white background from WelcomeView so it inherits cream

**Files:**
- Modify: `components/app/welcome-view.tsx` (line 33)

Context: `<section>` currently has `bg-background` which would paint a white-ish rectangle over the layout's cream. Removing the class lets the layout's `bg-beige-200` show through.

- [ ] **Step 1: Read the current state of the file**

Confirm line 33 contains `<section className="bg-background flex flex-col items-center justify-center text-center">`.

- [ ] **Step 2: Edit the section className**

Change line 33 from:

```tsx
<section className="bg-background flex flex-col items-center justify-center text-center">
```

to:

```tsx
<section className="flex flex-col items-center justify-center text-center">
```

Only the `bg-background` token is removed. No other changes to this file.

- [ ] **Step 3: Verify type-check and lint pass**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/app/welcome-view.tsx
git commit -m "fix(agent): let WelcomeView inherit layout background"
```

---

### Task 4: Visual verification in browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Wait for the "Ready" message and the local URL (typically http://localhost:3000).

- [ ] **Step 2: Visit /agent and verify the layout visually**

Open `http://localhost:3000/agent` in the browser.

Verify each of these:
- Background is the cream tone `#f3ede7` (matches the mockup).
- A small sage-green card is centered at the top of the viewport, containing the Riverside logo.
- The welcome content (icon, "Chat live..." text, "Start the experience" button) is rendered below the header.
- The page does **not** scroll vertically — the layout occupies exactly the viewport height.
- No white rectangle behind the welcome content.

- [ ] **Step 3: Verify home is unaffected**

Open `http://localhost:3000/`.
Verify the home page renders identically to before — no cream override, primary nav intact, hero image visible.

- [ ] **Step 4: Verify narrow viewport**

Resize the browser to ~375px wide (or use devtools mobile emulation) on `/agent`.
Verify the logo card is still centered and the welcome content still fits without horizontal scroll.

- [ ] **Step 5: Stop the dev server**

Stop the `pnpm dev` process (Ctrl+C).

- [ ] **Step 6: No commit needed** — verification only. If any check fails, return to the relevant task and fix before continuing.

---

## Verification Summary

After all four tasks:
- `pnpm tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `/agent` renders cream + sage logo card + welcome content, no scroll.
- `/` renders unchanged.

## Out of Scope (do not add)

- Navigation links, exit/back button, menu, theme toggle.
- Mobile-specific header variants.
- Animations or transitions.
- Component unit tests (no test framework configured in this repo).
- Changes to any route outside `/agent`.
