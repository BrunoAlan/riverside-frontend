# Experiences Panel Scroll Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the "Experiences" heading fixed and scroll the experience cards inside a viewport-bounded column with a hidden scrollbar, so the Confirm/Reject footer of a tall card is never clipped by the window.

**Architecture:** Mirror the fixed-header + scrolling-body pattern already used by `city-detail-card.tsx`. Split `CityExperiencesPanel` into a height-bounded outer container, a `shrink-0` heading, and an inner `overflow-y-auto` list with `min-h-0`. Add a Tailwind v4 `scrollbar-hide` utility to suppress the scrollbar chrome.

**Tech Stack:** Next.js (App Router), React client component, Tailwind CSS v4 (`@import 'tailwindcss'`, `@utility`). Package manager: `pnpm`.

---

### Task 1: Fixed heading + hidden-scrollbar scrolling list

**Files:**
- Modify: `styles/globals.css`
- Modify: `components/panels/map/city-experiences-panel.tsx`

**Context:** `CityExperiencesPanel` is the right-hand column of experience cards shown beside the city detail card (rendered by `panel-map.tsx`, which centers both with `flex items-center`). Today the whole column — heading included — is one `max-h-[85vh] overflow-y-auto` div; on the tallest expanded card the Confirm/Reject footer falls past the window bottom and is clipped. We are pinning the heading and moving the scroll to an inner list, and hiding the scrollbar. No other files change. There are no automated tests for this component (per `conventions/testing.md`, only `lib/**/*.test.ts` is collected); verification is `pnpm lint` + `pnpm test` (suite stays green) + manual dev-panel checks.

- [ ] **Step 1: Add the `scrollbar-hide` utility to `styles/globals.css`**

Append this block at the end of `styles/globals.css` (the file already uses Tailwind v4 `@import 'tailwindcss'` and contains other `@utility`/`@layer` blocks):

```css
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 2: Restructure `city-experiences-panel.tsx` into fixed heading + scrolling list**

Replace the entire contents of `components/panels/map/city-experiences-panel.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { ExperienceCard } from '@/components/panels/map/experience-card';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 440;

type CityExperiencesPanelProps = {
  experiences: Experience[];
};

export function CityExperiencesPanel({ experiences }: CityExperiencesPanelProps) {
  const [openId, setOpenId] = useState<string | null>(experiences[0]?.id ?? null);

  return (
    <div
      className="pointer-events-auto flex max-h-[85vh] flex-col gap-3"
      style={{ width: PANEL_WIDTH }}
    >
      <p className="text-muted-foreground shrink-0 px-2 text-xs tracking-wide uppercase">
        Experiences
      </p>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {experiences.map((experience) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            expanded={experience.id === openId}
            onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
          />
        ))}
      </div>
    </div>
  );
}
```

Changes vs. current: outer div is now `max-h-[85vh] flex flex-col gap-3` (bounds height, no longer scrolls itself); the heading gains `shrink-0` so it stays fixed; the card `.map` is wrapped in a new inner div `scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1` that owns the scroll. The `'use client'`, `useState`, `PANEL_WIDTH`, `openId`, and the per-card `expanded`/`onToggle` props are unchanged.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: PASS with no new errors/warnings.

- [ ] **Step 4: Verify the test suite still passes**

Run: `pnpm test`
Expected: PASS — same count as before (no `lib/` logic changed).

- [ ] **Step 5: Manual dev-panel verification (human)**

Per `conventions/testing.md` this component has no unit tests; the human verifies in the dev panel using the Danube Legends mock (the Wachau Valley / "Signature Hungary: National Day Celebration" card is the tall one):
- The "Experiences" heading stays fixed at the top while the cards scroll under it.
- No visible scrollbar on the column.
- Expanding the tall card, its Confirm/Reject footer is reachable by scrolling and is not clipped by the window bottom.
- A city whose cards all fit shows no scrollbar and looks unchanged.

- [ ] **Step 6: Commit**

```bash
git add styles/globals.css components/panels/map/city-experiences-panel.tsx
git commit -m "fix: pin experiences heading and scroll cards with hidden scrollbar"
```
