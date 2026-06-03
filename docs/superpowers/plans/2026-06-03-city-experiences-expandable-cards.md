# City Experiences as Expandable Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a city's experiences as a separate column of independently-expandable cards next to the city detail card, instead of inside it.

**Architecture:** Add an optional `images` field to the `Experience` schema. Build two new components under `components/panels/map/`: `ExperienceCard` (expandable, with gallery + stub Confirm/Reject) and `CityExperiencesPanel` (the column). Move the overlay positioning out of `CityDetailCard` into `panel-map.tsx`, which renders the detail card and the experiences column side by side.

**Tech Stack:** Next.js (App Router) client components, React `useState`, Zod, shadcn `Card`/`Button`, `next/image`, Phosphor icons, Vitest (lib only), Tailwind.

---

## Spec

See `docs/superpowers/specs/2026-06-03-city-experiences-expandable-cards-design.md`.

## File structure

- `lib/agent-ui/commands.ts` — add `images` to `Experience` schema. (modify)
- `lib/agent-ui/commands.test.ts` — schema test for `images`. (modify)
- `lib/dev/mocks.ts` — add `images` to Danube Legends experiences. (modify)
- `components/panels/map/experience-card.tsx` — one expandable experience card + inline gallery. (create)
- `components/panels/map/city-experiences-panel.tsx` — the experiences column. (create)
- `components/panels/map/city-detail-card.tsx` — drop experiences block + own positioning wrapper. (modify)
- `components/panels/map/panel-map.tsx` — overlay wrapper renders both cards side by side. (modify)

Per `conventions/testing.md`, only `lib/**/*.test.ts` is collected; React components are verified visually in the dev panel — no component tests.

---

### Task 1: Add `images` to the `Experience` schema (TDD)

**Files:**
- Test: `lib/agent-ui/commands.test.ts` (add a test after the existing `parses show_itinerary_options with per-city experiences` test, which ends at line 328)
- Modify: `lib/agent-ui/commands.ts:21-27`

- [ ] **Step 1: Write the failing test**

Add this `it(...)` block immediately after the test that ends at line 328 (before `it('rejects a malformed experience entry', ...)`):

```ts
  it('parses a per-city experience with images', () => {
    const result = UiCommand.parse({
      type: 'show_itinerary_options',
      correlationId: 'c-exp-images',
      payload: {
        itinerary: {
          id: 'danube_legends',
          name: 'Danube Legends',
          duration: { days: 12, nights: 11 },
          match_score: 0.6667,
          departure_dates: ['2026-04-22'],
          center: [16.57, 48.15],
          zoom: 6,
          cities: [
            {
              id: 'vienna',
              name: 'Vienna',
              country: 'Austria',
              image: 'https://example.com/vienna.jpg',
              days: 'Days 5, 10 & 11',
              lon: 16.3738,
              lat: 48.2082,
              experiences: [
                {
                  id: 'signature_vienna_belvedere_palace',
                  name: 'Signature Vienna: VIP Evening at Belvedere Palace',
                  type: 'private_concert_and_museum_visit',
                  venue: 'Belvedere Palace',
                  description: 'After-hours VIP experience at Belvedere Palace.',
                  images: [
                    'https://example.com/belvedere-1.jpg',
                    'https://example.com/belvedere-2.jpg',
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    if (result.type !== 'show_itinerary_options') throw new Error('discriminator failed');
    expect(result.payload.itinerary.cities[0].experiences?.[0].images).toEqual([
      'https://example.com/belvedere-1.jpg',
      'https://example.com/belvedere-2.jpg',
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test commands -- -t "parses a per-city experience with images"`
Expected: FAIL — Zod strips the unknown `images` key, so `images` is `undefined` and `toEqual([...])` fails.

- [ ] **Step 3: Add the field to the schema**

In `lib/agent-ui/commands.ts`, change the `Experience` object (lines 21-27) to:

```ts
export const Experience = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  venue: z.string().nullable(),
  description: z.string(),
  images: z.array(z.string()).optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test commands -- -t "parses a per-city experience with images"`
Expected: PASS. Also run `pnpm test commands` to confirm the existing experience/day_details tests still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/agent-ui/commands.ts lib/agent-ui/commands.test.ts
git commit -m "feat: add optional images to Experience schema"
```

---

### Task 2: Add `images` to the Danube Legends mock experiences

**Files:**
- Modify: `lib/dev/mocks.ts` (Budapest experiences ~lines 81-106; Vienna experience ~lines 158-167)

No test (mock data; verified in dev panel).

- [ ] **Step 1: Add images to the Budapest experiences**

In `lib/dev/mocks.ts`, the Budapest `experiences` array has three entries. Add an `images` array to each, reusing cloudinary URLs already present in the file. Replace the three experience objects (lines 82-105) with:

```ts
        {
          id: 'signature_hungary_national_day',
          name: 'Signature Hungary: National Day Celebration',
          type: 'national_day_fireworks_event',
          venue: null,
          description:
            'Hungary National Day celebration with food, drinks, music and fireworks views from Vista Deck.',
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
          ],
        },
        {
          id: 'signature_budapest_horse_railway',
          name: 'Signature Budapest: Private Concert at Horse Railway Cultural Center',
          type: 'private_concert',
          venue: 'Horse Railway Cultural Center',
          description:
            "Private performance with champagne and hors d'oeuvres at reconstructed Zugliget Horse Railway terminal.",
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
          ],
        },
        {
          id: 'signature_budapest_wenckheim_palace',
          name: 'Signature Budapest: Private Concert at Wenckheim Palace',
          type: 'private_concert',
          venue: 'Wenckheim Palace',
          description:
            "Private concert at Neo-Baroque Wenckheim Palace in Budapest's Palace Quarter.",
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
          ],
        },
```

- [ ] **Step 2: Add images to the Vienna experience**

Replace the single Vienna experience object (lines 159-166) with:

```ts
        {
          id: 'signature_vienna_belvedere_palace',
          name: 'Signature Vienna: VIP Evening at Belvedere Palace',
          type: 'private_concert_and_museum_visit',
          venue: 'Belvedere Palace',
          description:
            'After-hours or VIP-style experience at Belvedere Palace with palace visit, art viewing and private Mozart/Strauss concert.',
          images: [
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_004_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676651/hiperfunnel/riverside_mozart_mvp/page_005_image_01.jpg',
            'https://res.cloudinary.com/dxcabwnx7/image/upload/v1778676657/hiperfunnel/riverside_mozart_mvp/page_007_image_01.jpg',
          ],
        },
```

- [ ] **Step 3: Verify the mock still type-checks**

Run: `pnpm lint`
Expected: no errors related to `lib/dev/mocks.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/dev/mocks.ts
git commit -m "chore: add experience images to Danube Legends dev mock"
```

---

### Task 3: Create the `ExperienceCard` component

**Files:**
- Create: `components/panels/map/experience-card.tsx`

No test (UI component; verified in dev panel).

- [ ] **Step 1: Create the component file**

Create `components/panels/map/experience-card.tsx` with exactly:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CaretDownIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/shadcn/utils';
import type { Experience } from '@/lib/agent-ui/commands';

type ExperienceCardProps = {
  experience: Experience;
  defaultExpanded: boolean;
};

export function ExperienceCard({ experience, defaultExpanded }: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const images = experience.images ?? [];

  return (
    <Card className="bg-beige-50 border-beige-400/50 flex flex-col gap-0 overflow-hidden rounded-3xl p-3">
      {expanded && images.length > 0 && (
        <ExperienceGallery images={images} alt={experience.name} />
      )}
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
          onClick={() => setExpanded((value) => !value)}
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
      <div className="relative h-48 w-full overflow-hidden rounded-2xl">
        <Image src={activeSrc} alt={alt} fill sizes="380px" className="object-cover" />
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

- [ ] **Step 2: Verify it lints and type-checks**

Run: `pnpm lint`
Expected: no errors for `experience-card.tsx`. (The file is not imported yet, so this only checks the file itself.)

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/experience-card.tsx
git commit -m "feat: add ExperienceCard expandable component"
```

---

### Task 4: Create the `CityExperiencesPanel` column

**Files:**
- Create: `components/panels/map/city-experiences-panel.tsx`

No test (UI component; verified in dev panel).

- [ ] **Step 1: Create the component file**

Create `components/panels/map/city-experiences-panel.tsx` with exactly:

```tsx
import { ExperienceCard } from '@/components/panels/map/experience-card';
import type { Experience } from '@/lib/agent-ui/commands';

const PANEL_WIDTH = 380;

type CityExperiencesPanelProps = {
  experiences: Experience[];
};

export function CityExperiencesPanel({ experiences }: CityExperiencesPanelProps) {
  return (
    <div
      className="pointer-events-auto flex max-h-[85vh] flex-col gap-3 overflow-y-auto pr-1"
      style={{ width: PANEL_WIDTH }}
    >
      <p className="text-muted-foreground px-2 text-xs tracking-wide uppercase">Experiences</p>
      {experiences.map((experience, index) => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          defaultExpanded={index === 0}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it lints and type-checks**

Run: `pnpm lint`
Expected: no errors for `city-experiences-panel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/city-experiences-panel.tsx
git commit -m "feat: add CityExperiencesPanel column"
```

---

### Task 5: Remove experiences and positioning wrapper from `CityDetailCard`

**Files:**
- Modify: `components/panels/map/city-detail-card.tsx`

No test (UI component; verified in dev panel).

- [ ] **Step 1: Replace the component body**

In `components/panels/map/city-detail-card.tsx`, replace the entire `return (...)` of `CityDetailCard` (lines 17-76) with the version below. This drops the outer `pointer-events-none absolute … flex items-center justify-center` wrapper (positioning now lives in `panel-map.tsx`) and removes the experiences block; the `day_details` block stays:

```tsx
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-3xl p-3 shadow-lg"
      style={{ width: CARD_WIDTH }}
    >
      <div className="relative shrink-0">
        <Image
          src={city.image}
          alt={city.name}
          width={CARD_WIDTH}
          height={200}
          className="h-[200px] w-full rounded-2xl object-cover"
        />
        <span className="bg-beige-200 text-primary absolute top-3 left-3 rounded-full px-3 py-1 text-sm whitespace-nowrap">
          {city.days}
        </span>
      </div>
      <div className="flex shrink-0 items-start justify-between gap-2 px-2 pt-4">
        <div>
          <p className="text-2xl leading-tight">{city.name}</p>
          <p className="text-muted-foreground text-base">{city.country}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Close ${city.name} detail`}
          onClick={onClose}
        >
          <XIcon weight="bold" />
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-4 overflow-y-auto px-2 pb-2">
        {city.day_details?.map((detail, i) => (
          <div key={`${detail.day}-${i}`}>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">{detail.day}</p>
            <p className="text-primary mt-2 text-sm leading-relaxed">{detail.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
```

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: errors will appear in `panel-map.tsx` only if it still relies on the old centered behavior (fixed in Task 6). `city-detail-card.tsx` itself must lint clean — confirm no unused imports remain (all of `Image`, `XIcon`, `Button`, `Card`, `ItineraryCity` are still used).

- [ ] **Step 3: Commit**

```bash
git add components/panels/map/city-detail-card.tsx
git commit -m "refactor: drop experiences and positioning wrapper from CityDetailCard"
```

---

### Task 6: Wire both cards side by side in `panel-map.tsx`

**Files:**
- Modify: `components/panels/map/panel-map.tsx:5` (imports) and `:62` (render)

No test (UI component; verified in dev panel).

- [ ] **Step 1: Add the import**

In `components/panels/map/panel-map.tsx`, add this import directly below the existing `CityDetailCard` import (line 5):

```tsx
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
```

- [ ] **Step 2: Replace the detail-card render**

Replace line 62:

```tsx
      {detailCity && <CityDetailCard city={detailCity} onClose={handleClose} />}
```

with:

```tsx
      {detailCity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
          <CityDetailCard city={detailCity} onClose={handleClose} />
          {detailCity.experiences && detailCity.experiences.length > 0 && (
            <CityExperiencesPanel experiences={detailCity.experiences} />
          )}
        </div>
      )}
```

- [ ] **Step 3: Verify lint and tests**

Run: `pnpm lint && pnpm test`
Expected: lint clean; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/panels/map/panel-map.tsx
git commit -m "feat: show city experiences column beside the detail card"
```

---

### Task 7: Manual verification in the dev panel

**Files:** none (verification only).

- [ ] **Step 1: Run lint and the full test suite one more time**

Run: `pnpm lint && pnpm test`
Expected: both pass clean (required before any push/merge per AGENTS.MD).

- [ ] **Step 2: Verify visually in the dev panel**

Run: `pnpm dev`, open the dev panel, and load the Danube Legends itinerary mock. Confirm:
- Opening **Budapest** (3 experiences): detail card on the left with Day descriptions only (no experiences inside it); experiences column on the right; **only the first** card expanded (gallery + description + Confirm/Reject visible), the other two collapsed (name + venue + caret).
- Expanding/collapsing each card works independently; the caret rotates.
- Opening **Vienna** (1 experience): the single experience card is expanded.
- Opening a city with **no experiences** (e.g. Dürnstein): only the detail card shows, centered.
- No "Day 1 / Day 2" labels appear on the experience cards.

- [ ] **Step 3: Note completion**

No code change in this task. If any check fails, fix in the relevant component and re-run Step 1.
