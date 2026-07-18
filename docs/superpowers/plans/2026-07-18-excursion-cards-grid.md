# Excursion Cards Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Excursions tab's hero-plus-list layout with a wrapping grid of media cards, each showing an image, a day badge, a title, and a `View details` / day-selector / `Add` footer.

**Architecture:** Two pure helpers in `lib/map/` do the data shaping (flatten experiences with their city days; format the badge label). A new `ExcursionCard` renders one card and a new `ExcursionDetailDialog` renders the modal. `ExcursionsPanel` is rewritten as a grid container owning the single open-dialog id, so the backend's `show_experience_detail` can still drive it. The map overlay's `ExperienceCard` and `CityExperiencesPanel` are untouched.

**Tech Stack:** Next.js (App Router), React 19 client components, Tailwind v4 with `--beige-*` CSS-variable tokens, shadcn primitives (`Card`, `Button`, `Dialog`), `@phosphor-icons/react`, `next/image`, Vitest (node environment).

## Global Constraints

- Package manager is `pnpm`. Never invoke `npm` or `yarn`.
- Never edit `components/ui/` by hand. `dialog.tsx`, `card.tsx`, `button.tsx` already exist and are used as-is.
- Vitest only collects `lib/**/*.test.ts` (`vitest.config.ts:12`). React components are not unit-tested — they are verified visually in the dev panel.
- Tests live next to the code they cover (`foo.ts` ↔ `foo.test.ts`).
- Class merging uses `cn()` from `@/lib/shadcn/utils`.
- Card chrome uses the house recipe: `bg-beige-50 border-beige-400/50 gap-0 overflow-hidden rounded-2xl shadow-none`.
- Icons use `@phosphor-icons/react` with `weight="bold"`.
- No changes to `lib/agent-ui/commands.ts`. No `price` field is added.
- Do not modify `components/panels/map/city-experiences-panel.tsx` or `lib/map/build-experience-day-options.ts` — they remain the map overlay's path. `components/panels/map/experience-card.tsx` is modified in Task 3 only, to consume the extracted shared gallery; its behaviour must not change.
- Work happens on branch `feat/excursion-cards-grid`.

---

### Task 1: `formatDayBadge` helper

**Files:**
- Create: `lib/map/format-day-badge.ts`
- Test: `lib/map/format-day-badge.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatDayBadge(days: string[]): string` — used by Task 3's card.

- [ ] **Step 1: Write the failing test**

Create `lib/map/format-day-badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDayBadge } from './format-day-badge';

describe('formatDayBadge', () => {
  it('renders a single day in the singular', () => {
    expect(formatDayBadge(['Day 1'])).toBe('Day 1');
  });

  it('joins exactly two days with an ampersand', () => {
    expect(formatDayBadge(['Day 1', 'Day 3'])).toBe('Days 1 & 3');
  });

  it('truncates three or more days to the first two plus a remainder count', () => {
    expect(formatDayBadge(['Day 1', 'Day 2', 'Day 6', 'Day 7'])).toBe('Days 1, 2 +2');
  });

  it('returns an empty string for no days', () => {
    expect(formatDayBadge([])).toBe('');
  });

  it('falls back to the raw labels when they carry no day numbers', () => {
    expect(formatDayBadge(['At sea'])).toBe('At sea');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test format-day-badge`
Expected: FAIL — `Failed to resolve import "./format-day-badge"`.

- [ ] **Step 3: Write the implementation**

Create `lib/map/format-day-badge.ts`:

```ts
// Day options arrive as "Day N" labels from parseCityDays. A card badge has room
// for one short line, so collapse them: "Day 1", "Days 1 & 3", "Days 1, 2 +2".
// Labels without a day number (parseCityDays' raw-string fallback) pass through.
export function formatDayBadge(days: string[]): string {
  if (days.length === 0) return '';

  const numbers = days.map((day) => day.match(/\d+/)?.[0]).filter((n): n is string => Boolean(n));
  if (numbers.length !== days.length) {
    return days.join(', ');
  }

  if (numbers.length === 1) return `Day ${numbers[0]}`;
  if (numbers.length === 2) return `Days ${numbers[0]} & ${numbers[1]}`;
  return `Days ${numbers[0]}, ${numbers[1]} +${numbers.length - 2}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test format-day-badge`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/map/format-day-badge.ts lib/map/format-day-badge.test.ts
git commit -m "feat(map): add formatDayBadge for compact day labels"
```

---

### Task 2: `buildExcursionItems` helper

**Files:**
- Create: `lib/map/build-excursion-items.ts`
- Test: `lib/map/build-excursion-items.test.ts`

**Interfaces:**
- Consumes: `parseCityDays(days: string): string[]` from `@/lib/map/parse-city-days`; the `Experience` and `ItineraryCity` types from `@/lib/agent-ui/commands`.
- Produces: `type ExcursionItem = { experience: Experience; dayOptions: string[] }` and `buildExcursionItems(cities: ItineraryCity[]): ExcursionItem[]` — both used by Task 5's panel.

- [ ] **Step 1: Write the failing test**

Create `lib/map/build-excursion-items.test.ts`. The `city()` helper mirrors the one in `build-experience-day-options.test.ts:5-16`:

```ts
import { describe, expect, it } from 'vitest';
import type { ItineraryCity } from '@/lib/agent-ui/commands';
import { buildExcursionItems } from './build-excursion-items';

function city(overrides: Partial<ItineraryCity>): ItineraryCity {
  return {
    id: 'city-1',
    name: 'Budapest',
    country: 'Hungary',
    image: 'budapest.jpg',
    days: 'Days 1 & 2',
    lon: 19.04,
    lat: 47.5,
    ...overrides,
  };
}

describe('buildExcursionItems', () => {
  it("pairs each experience with its own city's parsed days", () => {
    const cities: ItineraryCity[] = [
      city({
        id: 'budapest',
        name: 'Budapest',
        days: 'Days 1 & 2',
        experiences: [
          { id: 'exp-1', name: 'Thermal baths', type: 'wellness', venue: null, description: 'Relax.' },
        ],
      }),
      city({
        id: 'vienna',
        name: 'Vienna',
        days: 'Days 4, 5 & 6',
        experiences: [
          { id: 'exp-2', name: 'Opera tour', type: 'culture', venue: null, description: 'Backstage.' },
        ],
      }),
    ];

    const items = buildExcursionItems(cities);

    expect(items).toHaveLength(2);
    expect(items[0].experience.id).toBe('exp-1');
    expect(items[0].dayOptions).toEqual(['Day 1', 'Day 2']);
    expect(items[1].experience.id).toBe('exp-2');
    expect(items[1].dayOptions).toEqual(['Day 4', 'Day 5', 'Day 6']);
  });

  it('skips a city with no experiences', () => {
    expect(buildExcursionItems([city({ id: 'bratislava' })])).toEqual([]);
  });

  it('returns an empty list for no cities', () => {
    expect(buildExcursionItems([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test build-excursion-items`
Expected: FAIL — `Failed to resolve import "./build-excursion-items"`.

- [ ] **Step 3: Write the implementation**

Create `lib/map/build-excursion-items.ts`:

```ts
import type { Experience, ItineraryCity } from '@/lib/agent-ui/commands';
import { parseCityDays } from '@/lib/map/parse-city-days';

export type ExcursionItem = {
  experience: Experience;
  dayOptions: string[];
};

// Flattens the itinerary's experiences into a single list for the Excursions grid,
// carrying each experience's owning city days forward so a card can render its day
// badge and selector without looking the city up again.
export function buildExcursionItems(cities: ItineraryCity[]): ExcursionItem[] {
  return cities.flatMap((city) => {
    const dayOptions = parseCityDays(city.days);
    return (city.experiences ?? []).map((experience) => ({ experience, dayOptions }));
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test build-excursion-items`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/map/build-excursion-items.ts lib/map/build-excursion-items.test.ts
git commit -m "feat(map): add buildExcursionItems to pair experiences with city days"
```

---

### Task 3: Shared gallery + `ExcursionDetailDialog`

**Files:**
- Create: `components/shared/experience-gallery.tsx`
- Modify: `components/panels/map/experience-card.tsx` (delete the local `ExperienceGallery` at :161-191, import the shared one)
- Create: `components/panels/itinerary/excursion-detail-dialog.tsx`

The gallery is extracted first because the dialog needs the same hero-plus-thumbnails
widget that `experience-card.tsx:161-191` already implements. Copying it would
duplicate ~30 lines verbatim. The only differences between the two call sites are the
hero height and the `sizes` hint, so both become props.

`ExperienceCard`'s rendered output must not change: it passes `heroClassName="h-36"`
and `heroSizes="440px"`, which are its current values.

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`; `Button` from `@/components/ui/button`; `Experience` from `@/lib/agent-ui/commands`; `cn` from `@/lib/shadcn/utils`.
- Produces (gallery): `ExperienceGallery({ images, alt, heroClassName, heroSizes }: { images: string[]; alt: string; heroClassName: string; heroSizes: string })` from `@/components/shared/experience-gallery`.
- Produces: `ExcursionDetailDialog` with props
  `{ experience: Experience; images: string[]; open: boolean; onOpenChange: (open: boolean) => void; dayOptions: string[]; selectedDay: string; onSelectDay: (day: string) => void; addedDays: string[]; onConfirm: (day: string) => void }`.
  The selected day is lifted to the parent card so the card footer and the dialog stay in sync.

This task has no automated test — these are React components, which this repo does not unit-test (`conventions/testing.md:21`). Verified in Task 5.

- [ ] **Step 1: Extract the shared gallery**

Create `components/shared/experience-gallery.tsx` by moving the function from
`experience-card.tsx:161-191` and parameterising the two hard-coded values:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/shadcn/utils';

// Hero image plus a thumbnail strip. Used by the map overlay's experience card and
// by the Excursions detail dialog, which differ only in hero size.
export function ExperienceGallery({
  images,
  alt,
  heroClassName,
  heroSizes,
}: {
  images: string[];
  alt: string;
  heroClassName: string;
  heroSizes: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('relative w-full overflow-hidden rounded-lg', heroClassName)}>
        <Image src={activeSrc} alt={alt} fill sizes={heroSizes} className="object-cover" />
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
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition',
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

- [ ] **Step 2: Point `ExperienceCard` at the shared gallery**

In `components/panels/map/experience-card.tsx`:

1. Delete the local `ExperienceGallery` function (lines 161-191).
2. Add the import `import { ExperienceGallery } from '@/components/shared/experience-gallery';`
3. Replace the call site at line 86 with:

```tsx
{expanded && images.length > 0 && (
  <div className="mb-2">
    <ExperienceGallery
      images={images}
      alt={experience.name}
      heroClassName="h-36"
      heroSizes="440px"
    />
  </div>
)}
```

The wrapper `div` carries the `mb-2` that the old local gallery had on its own root,
so spacing is unchanged.

- [ ] **Step 3: Verify the extraction is behaviour-neutral**

Run: `pnpm lint && pnpm test`
Expected: both PASS. Confirm `git diff components/panels/map/experience-card.tsx` shows only the import, the call site, and the deleted function — no other behavioural change.

- [ ] **Step 4: Write the dialog**

Create `components/panels/itinerary/excursion-detail-dialog.tsx`:

```tsx
'use client';

import { CheckIcon } from '@phosphor-icons/react';
import { ExperienceGallery } from '@/components/shared/experience-gallery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Experience } from '@/lib/agent-ui/commands';

type ExcursionDetailDialogProps = {
  experience: Experience;
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOptions: string[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  addedDays: string[];
  onConfirm: (day: string) => void;
};

export function ExcursionDetailDialog({
  experience,
  images,
  open,
  onOpenChange,
  dayOptions,
  selectedDay,
  onSelectDay,
  addedDays,
  onConfirm,
}: ExcursionDetailDialogProps) {
  const isSelectedDayAdded = addedDays.includes(selectedDay);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-beige-50 border-beige-400/50 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl leading-snug">{experience.name}</DialogTitle>
          {experience.venue && (
            <DialogDescription className="text-muted-foreground text-sm">
              {experience.venue}
            </DialogDescription>
          )}
        </DialogHeader>
        {images.length > 0 && (
          <ExperienceGallery
            images={images}
            alt={experience.name}
            heroClassName="h-56"
            heroSizes="512px"
          />
        )}
        <p className="text-primary/80 text-sm leading-relaxed">{experience.description}</p>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`dialog-day-${experience.id}`} className="sr-only">
            Day for {experience.name}
          </label>
          <select
            id={`dialog-day-${experience.id}`}
            value={selectedDay}
            onChange={(event) => onSelectDay(event.target.value)}
            disabled={dayOptions.length === 0}
            className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-2 py-1 text-sm"
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSelectedDayAdded || !selectedDay}
            onClick={() => onConfirm(selectedDay)}
          >
            {isSelectedDayAdded ? (
              <>
                <CheckIcon weight="bold" /> Added
              </>
            ) : (
              'Add'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

- [ ] **Step 5: Verify it compiles and lints**

Run: `pnpm lint && pnpm test`
Expected: both PASS. The dialog is not yet imported anywhere, which is fine — it is wired up in Task 4.

- [ ] **Step 6: Commit**

```bash
git add components/shared/experience-gallery.tsx components/panels/map/experience-card.tsx components/panels/itinerary/excursion-detail-dialog.tsx
git commit -m "feat(itinerary): extract shared experience gallery and add excursion detail dialog"
```

---

### Task 4: `ExcursionCard`

**Files:**
- Create: `components/panels/itinerary/excursion-card.tsx`

**Interfaces:**
- Consumes: `formatDayBadge` (Task 1); `ExcursionDetailDialog` (Task 3); `DaysBadge` from `@/components/shared/days-badge`; `Card` from `@/components/ui/card`; `Button` from `@/components/ui/button`; `Experience` from `@/lib/agent-ui/commands`; `cn` from `@/lib/shadcn/utils`.
- Produces: `ExcursionCard` with props
  `{ experience: Experience; dayOptions: string[]; addedDays: string[]; detailOpen: boolean; onDetailOpenChange: (open: boolean) => void; onConfirm: (day: string) => void }`,
  Card width is a module-local constant, not exported — nothing outside the card needs it.

No automated test — React component, verified in Task 5.

- [ ] **Step 1: Write the component**

Create `components/panels/itinerary/excursion-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckIcon } from '@phosphor-icons/react';
import { ExcursionDetailDialog } from '@/components/panels/itinerary/excursion-detail-dialog';
import { DaysBadge } from '@/components/shared/days-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Experience } from '@/lib/agent-ui/commands';
import { formatDayBadge } from '@/lib/map/format-day-badge';
import { cn } from '@/lib/shadcn/utils';

const CARD_WIDTH = 260;

type ExcursionCardProps = {
  experience: Experience;
  dayOptions: string[];
  addedDays: string[];
  detailOpen: boolean;
  onDetailOpenChange: (open: boolean) => void;
  onConfirm: (day: string) => void;
};

export function ExcursionCard({
  experience,
  dayOptions,
  addedDays,
  detailOpen,
  onDetailOpenChange,
  onConfirm,
}: ExcursionCardProps) {
  const images = experience.images ?? (experience.image ? [experience.image] : []);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0] ?? '');

  const isAdded = addedDays.length > 0;
  const badgeLabel = formatDayBadge(dayOptions);

  return (
    <Card
      className={cn(
        'bg-beige-50 border-beige-400/50 pointer-events-auto flex shrink-0 flex-col gap-0 overflow-hidden rounded-2xl p-2 shadow-none',
        isAdded && 'border-primary/40 border-2'
      )}
      style={{ width: CARD_WIDTH }}
    >
      {images.length > 0 && (
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl">
          <Image
            src={images[0]}
            alt={experience.name}
            fill
            sizes="260px"
            className="object-cover"
          />
          {badgeLabel && <DaysBadge className="absolute top-1 left-1">{badgeLabel}</DaysBadge>}
        </div>
      )}
      <p className="text-primary mt-3 line-clamp-2 px-1 text-base leading-snug font-medium">
        {experience.name}
      </p>
      <div className="mt-auto flex items-center justify-between gap-1 px-1 pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDetailOpenChange(true)}>
          View details
        </Button>
        <div className="flex items-center gap-1">
          {!isAdded && dayOptions.length > 1 && (
            <>
              <label htmlFor={`card-day-${experience.id}`} className="sr-only">
                Day for {experience.name}
              </label>
              <select
                id={`card-day-${experience.id}`}
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="bg-beige-50 border-beige-400/50 text-primary rounded-md border px-1 py-1 text-xs"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </>
          )}
          {isAdded ? (
            <span className="text-primary inline-flex items-center gap-1 px-2 text-xs font-medium">
              <CheckIcon weight="bold" aria-hidden="true" /> {addedDays.join(', ')}
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedDay}
              onClick={() => onConfirm(selectedDay)}
            >
              Add
            </Button>
          )}
        </div>
      </div>
      <ExcursionDetailDialog
        experience={experience}
        images={images}
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
        dayOptions={dayOptions}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        addedDays={addedDays}
        onConfirm={onConfirm}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `pnpm lint`
Expected: PASS with no errors for `excursion-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/panels/itinerary/excursion-card.tsx
git commit -m "feat(itinerary): add excursion media card with day badge and inline day picker"
```

---

### Task 5: Rewrite `ExcursionsPanel` as a grid

**Files:**
- Modify: `components/panels/itinerary/excursions-panel.tsx` (full rewrite of the 99-line file)

**Interfaces:**
- Consumes: `buildExcursionItems` (Task 2); `ExcursionCard` (Task 4); `useScrollFade` from `@/hooks/use-scroll-fade`; `useAddedExperiences` from `@/lib/agent-ui/hooks`; `useFrontendIntent` from `@/hooks/use-frontend-intent`.
- Produces: unchanged public surface — `ExcursionsPanel({ itinerary, detailExperienceId })`. Its caller `itinerary-panel.tsx:41-49` needs no change.

This task deletes `CruiseHeroCard` (a local function at `excursions-panel.tsx:61-98`, no other call sites) and drops the `CityExperiencesPanel` import. `CityExperiencesPanel` and `ExperienceCard` files stay — the map overlay still uses them.

No automated test — React component, verified by hand in Step 3.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `components/panels/itinerary/excursions-panel.tsx` with:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExcursionCard } from '@/components/panels/itinerary/excursion-card';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import type { Experience, ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { buildExcursionItems } from '@/lib/map/build-excursion-items';

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
  detailExperienceId: string | undefined;
};

export function ExcursionsPanel({ itinerary, detailExperienceId }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const sendIntent = useFrontendIntent();
  const items = buildExcursionItems(itinerary?.cities ?? []);

  // Only one detail dialog is open at a time, and the backend's
  // show_experience_detail command must be able to drive it, so the open id lives
  // here rather than inside each card.
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade } = useScrollFade(scrollRef, [items.length]);

  useEffect(() => {
    if (detailExperienceId) {
      setOpenDetailId(detailExperienceId);
    }
  }, [detailExperienceId]);

  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  const handleExperienceConfirm = useCallback(
    (experience: Experience, day: string) => {
      void sendIntent('select_experience', {
        entities: { experience_id: experience.id, day },
        userMessage: `User added ${experience.name} for ${day}`,
      });
    },
    [sendIntent]
  );

  return (
    <div className="pointer-events-none absolute inset-0 p-6">
      <div
        className={`pointer-events-none absolute top-0 right-0 left-0 z-1 h-[60px] bg-gradient-to-b from-[#E7DCD3] transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'} `}
      />
      <div
        className="scrollbar-hide flex h-full flex-wrap content-start items-start gap-3 overflow-y-auto"
        ref={scrollRef}
      >
        {items.map(({ experience, dayOptions }) => (
          <ExcursionCard
            key={experience.id}
            experience={experience}
            dayOptions={dayOptions}
            addedDays={addedExperiences
              .filter((e) => e.experienceId === experience.id)
              .map((e) => e.day)}
            detailOpen={openDetailId === experience.id}
            onDetailOpenChange={(open) => {
              setOpenDetailId(open ? experience.id : null);
              if (open) handleExperienceExplore(experience);
            }}
            onConfirm={(day) => handleExperienceConfirm(experience, day)}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute right-0 bottom-0 left-0 z-1 h-[60px] bg-gradient-to-t from-[#EDE6DD] transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'} `}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run lint and the full test suite**

Run: `pnpm lint && pnpm test`
Expected: both PASS. `pnpm lint` must report no unused-import errors — `Card`, `Image`, `CityExperiencesPanel` and `buildExperienceDayOptions` are all gone from this file.

- [ ] **Step 3: Verify visually in the dev panel**

Run: `pnpm dev`, open the app, load the mock itinerary, and switch to the Excursions tab. Confirm:

1. No hero card — cards start at the top left over the map.
2. Four cards appear (three Budapest, one Vienna, per `lib/dev/mocks.ts:91-131,178-192`).
3. A Budapest card's badge reads `Days 1, 2 +2` (its city days are `'Days 1, 2, 6 & 7'`) and it shows an inline day `<select>`.
4. `View details` opens the dialog with the gallery, venue, and full description.
5. Adding from either the card or the dialog switches the card to its added state — `border-primary/40` border and a check with the confirmed day, with the selector and `Add` button gone.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/excursions-panel.tsx
git commit -m "feat(itinerary): render Excursions tab as a media card grid"
```

---

## Self-Review Notes

**Spec coverage.** Every spec section maps to a task: `formatDayBadge` and its truncation table → Task 1; `buildExcursionItems` and the data flow → Task 2; the detail dialog → Task 3; the card, badge, inline selector and added state → Task 4; the grid, scroll fades, `CruiseHeroCard` deletion and agent-driven detail → Task 5. The spec's "out of scope" items are enforced by the Global Constraints.

**Known deviation from the mockup.** The mockup shows only `View details` and `Add` in the footer; the inline day `<select>` sits between them and is the user's explicit choice over a detail-modal day picker. It renders only when a city spans more than one day, so single-day cards match the mockup exactly.

**Deliberately not carried over from `ExperienceCard`.** The full-width "Added" ribbon, the one-shot flash overlay, and the unwired "Reject" button. The first two are sized for a 440px row; the third was dead UI (`experience-card.tsx:135-138` — no intent is defined for it).
