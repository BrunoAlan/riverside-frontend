# Experience Cards Style + Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the city experience cards wider (440px) and shorter (smaller gallery image), and turn their expand behavior into a single-open, collapsible accordion.

**Architecture:** Lift the expanded state from each `ExperienceCard` up into `CityExperiencesPanel`, making the card a controlled component (`expanded` + `onToggle` props). The panel becomes the single source of truth for which card is open, so "only one open at a time" and "the open one is collapsible" both fall out of one piece of state.

**Tech Stack:** Next.js (App Router), React client components (`useState`), shadcn/ui `Card`/`Button`, `next/image`, Tailwind CSS. Package manager: `pnpm`.

---

### Task 1: Wider/shorter experience cards with accordion expand

**Files:**
- Modify: `components/panels/map/experience-card.tsx`
- Modify: `components/panels/map/city-experiences-panel.tsx`

**Context:** These two files render the right-hand experiences column shown beside the city detail card on the map (`components/panels/map/panel-map.tsx`). Today `ExperienceCard` owns its own `useState(defaultExpanded)`, so cards expand independently. We are flipping it to a controlled component and moving the state to the panel. No other files change. There are no automated tests for these components (per `conventions/testing.md`, only `lib/**/*.test.ts` is collected); verification is `pnpm lint` + manual dev-panel checks.

- [ ] **Step 1: Make `ExperienceCard` controlled and shrink the gallery**

Replace the entire contents of `components/panels/map/experience-card.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { cn } from '@/lib/shadcn/utils';

type ExperienceCardProps = {
  experience: Experience;
  expanded: boolean;
  onToggle: () => void;
};

export function ExperienceCard({ experience, expanded, onToggle }: ExperienceCardProps) {
  const images = experience.images ?? [];

  return (
    <Card className="bg-beige-50 border-beige-400/50 flex flex-col gap-0 overflow-hidden rounded-3xl p-3">
      {expanded && images.length > 0 && <ExperienceGallery images={images} alt={experience.name} />}
      <div className="flex items-start justify-between gap-2 px-2 pt-3">
        <div>
          <p className="text-primary text-base leading-snug">{experience.name}</p>
          {experience.venue && (
            <p className="text-muted-foreground mt-1 text-sm">{experience.venue}</p>
          )}
          {expanded && (
            <p className="text-primary/80 mt-2 text-sm leading-relaxed">{experience.description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="shrink-0"
          aria-label={expanded ? `Collapse ${experience.name}` : `Expand ${experience.name}`}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <CaretDownIcon
            weight="bold"
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 flex items-center justify-end gap-2 px-2 pb-1">
          {/* TODO: wire Confirm/Reject to the agent — decision payload not yet defined */}
          <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
            Confirm
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => {}}>
            Reject
          </Button>
        </div>
      )}
    </Card>
  );
}

function ExperienceGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-36 w-full overflow-hidden rounded-2xl">
        <Image src={activeSrc} alt={alt} fill sizes="440px" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition',
                index === activeIndex ? 'ring-primary ring-2' : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Changes vs. current: props are now `expanded` + `onToggle` (no `defaultExpanded`); the internal `useState`/`setExpanded` is gone; the toggle button's `onClick` is `onToggle`; gallery main image `h-48` → `h-36`; gallery `sizes="380px"` → `sizes="440px"`. The `ExperienceGallery` `activeIndex` state is intentionally kept.

- [ ] **Step 2: Lift open state into `CityExperiencesPanel` and widen it**

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
      className="pointer-events-auto flex max-h-[85vh] flex-col gap-3 overflow-y-auto pr-1"
      style={{ width: PANEL_WIDTH }}
    >
      <p className="text-muted-foreground px-2 text-xs tracking-wide uppercase">Experiences</p>
      {experiences.map((experience) => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          expanded={experience.id === openId}
          onToggle={() => setOpenId((prev) => (prev === experience.id ? null : experience.id))}
        />
      ))}
    </div>
  );
}
```

Changes vs. current: added `'use client'` and `useState` import; `PANEL_WIDTH` 380 → 440; new `openId` state initialised to the first experience's id; the map callback drops `index` and passes `expanded`/`onToggle` instead of `defaultExpanded`.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: PASS with no new errors/warnings in `experience-card.tsx` or `city-experiences-panel.tsx`. (If lint flags an unused import or variable, it means a leftover from the edits — remove it.)

- [ ] **Step 4: Verify the full test suite still passes**

Run: `pnpm test`
Expected: PASS — same count as before (no `lib/` logic changed; this confirms nothing was broken transitively).

- [ ] **Step 5: Manual dev-panel verification (human)**

Per `conventions/testing.md` these components have no unit tests; the human verifies in the dev panel:
- First card starts expanded, the rest collapsed.
- Opening a collapsed card collapses the previously-open one (only one open at a time).
- Clicking the open card collapses it, leaving all cards collapsed.
- Cards are visibly wider (440px) and the expanded gallery image is shorter.
- Single-experience case: that one card is expanded and can still be collapsed.

- [ ] **Step 6: Commit**

```bash
git add components/panels/map/experience-card.tsx components/panels/map/city-experiences-panel.tsx
git commit -m "feat: wider/shorter experience cards with accordion expand"
```
