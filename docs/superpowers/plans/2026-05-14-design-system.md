# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom design system on top of shadcn/ui — two-layer color tokens (raw palette + semantic), restyle 8 existing components, add 13 new ones, and ship a showcase page at `/design-system`.

**Architecture:** Tokens live in `styles/globals.css` (NOT `app/globals.css` — the spec referenced the wrong path; the project imports `@/styles/globals.css` from `app/layout.tsx`). Two layers: raw palette CSS vars (`--green-50`...`--success-950`) + semantic tokens (`--primary`, `--background`, etc.) mapping to raw. Both exposed to Tailwind v4 via `@theme inline`. Components in `components/ui/` consume only semantic tokens and use Radix + CVA + `cn()` from `@/lib/shadcn/utils`. Dark mode preserves the existing oklch values during the transition so the existing `ThemeToggle` keeps working; remapping dark to the new palette is a follow-up.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v4 (`@tailwindcss/postcss`), Radix UI, class-variance-authority, lucide-react, next-themes.

**Verification model:** This is a visual design system with no unit test framework in the project. Each task verifies via (a) TypeScript compilation (`pnpm tsc --noEmit`) and (b) visual inspection on `/design-system` after the showcase section for that component is added. Final task runs `pnpm build`.

**Hex bottleneck:** User passes hex values family by family. Steps that depend on hex are explicitly called out. Component implementation does NOT depend on hex (consumes semantic tokens only).

---

## File Structure

**Created:**
- `app/(design-system)/design-system/page.tsx` — showcase page
- `app/(design-system)/design-system/_components/section.tsx` — anchored section wrapper
- `app/(design-system)/design-system/_components/color-swatch.tsx` — color cell
- `app/(design-system)/design-system/_components/showcase-nav.tsx` — sticky side nav
- `components/ui/label.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/checkbox.tsx`
- `components/ui/radio-group.tsx`
- `components/ui/switch.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/avatar.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/dialog.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/tabs.tsx`

**Modified:**
- `styles/globals.css` — replace `:root` block with new token system
- `components/ui/button.tsx` — audit + ensure all classes use semantic tokens, update variants list
- `components/ui/button-group.tsx` — audit semantic tokens
- `components/ui/select.tsx` — audit semantic tokens
- `components/ui/alert.tsx` — audit + add `warning`/`success` variants
- `components/ui/separator.tsx` — audit
- `components/ui/sonner.tsx` — audit
- `components/ui/toggle.tsx` — audit
- `components/ui/tooltip.tsx` — audit
- `package.json` — add 6 new Radix deps

---

## Task 1: Replace `globals.css` token system

**Files:**
- Modify: `styles/globals.css`

- [ ] **Step 1: Replace `:root` block with raw palette + semantic mapping**

Open `styles/globals.css`. Replace lines 7–40 (the existing `:root` block) with this. Hex values are `#000000` placeholders — they will be filled in family by family as the user provides them.

```css
:root {
  /* ---------- Raw palette ---------- */
  /* Green */
  --green-50:  #000000;
  --green-100: #000000;
  --green-200: #000000;
  --green-300: #000000;
  --green-400: #000000;
  --green-500: #000000;
  --green-600: #000000;
  --green-700: #000000;
  --green-800: #000000;
  --green-900: #000000;
  --green-950: #000000;

  /* Beige */
  --beige-50:  #000000;
  --beige-100: #000000;
  --beige-200: #000000;
  --beige-300: #000000;
  --beige-400: #000000;
  --beige-500: #000000;
  --beige-600: #000000;
  --beige-700: #000000;
  --beige-800: #000000;
  --beige-900: #000000;
  --beige-950: #000000;

  /* Neutral */
  --neutral-50:  #000000;
  --neutral-100: #000000;
  --neutral-200: #000000;
  --neutral-300: #000000;
  --neutral-400: #000000;
  --neutral-500: #000000;
  --neutral-600: #000000;
  --neutral-700: #000000;
  --neutral-800: #000000;
  --neutral-900: #000000;
  --neutral-950: #000000;

  /* Error */
  --error-50:  #000000;
  --error-100: #000000;
  --error-200: #000000;
  --error-300: #000000;
  --error-400: #000000;
  --error-500: #000000;
  --error-600: #000000;
  --error-700: #000000;
  --error-800: #000000;
  --error-900: #000000;
  --error-950: #000000;

  /* Warning */
  --warning-50:  #000000;
  --warning-100: #000000;
  --warning-200: #000000;
  --warning-300: #000000;
  --warning-400: #000000;
  --warning-500: #000000;
  --warning-600: #000000;
  --warning-700: #000000;
  --warning-800: #000000;
  --warning-900: #000000;
  --warning-950: #000000;

  /* Success */
  --success-50:  #000000;
  --success-100: #000000;
  --success-200: #000000;
  --success-300: #000000;
  --success-400: #000000;
  --success-500: #000000;
  --success-600: #000000;
  --success-700: #000000;
  --success-800: #000000;
  --success-900: #000000;
  --success-950: #000000;

  /* ---------- Semantic tokens ---------- */
  --radius: 0.5rem;

  --background: var(--beige-50);
  --foreground: var(--neutral-950);

  --card: var(--neutral-50);
  --card-foreground: var(--neutral-950);

  --popover: var(--neutral-50);
  --popover-foreground: var(--neutral-950);

  --primary: var(--green-600);
  --primary-foreground: var(--neutral-50);

  --secondary: var(--beige-200);
  --secondary-foreground: var(--neutral-900);

  --muted: var(--neutral-100);
  --muted-foreground: var(--neutral-600);

  --accent: var(--beige-300);
  --accent-foreground: var(--neutral-900);

  --destructive: var(--error-600);
  --destructive-foreground: var(--neutral-50);

  --warning: var(--warning-500);
  --warning-foreground: var(--neutral-950);

  --success: var(--success-600);
  --success-foreground: var(--neutral-50);

  --border: var(--neutral-200);
  --input: var(--neutral-200);
  --ring: var(--green-600);

  /* Charts — keep existing oklch defaults for now, not in design system scope */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Sidebar — keep existing oklch defaults */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

- [ ] **Step 2: Leave existing `.dark { ... }` block unchanged**

The existing `.dark` block (lines 42–74 originally) stays as-is for now. This keeps `ThemeToggle` functional during the transition. A follow-up spec will remap dark tokens to the new palette.

Add this comment immediately above the `.dark` block:

```css
/* TODO(design-system): remap dark mode to new raw palette (currently uses shadcn defaults). */
```

- [ ] **Step 3: Extend `@theme inline` with raw palette + new semantic vars**

In the `@theme inline { ... }` block, ADD these lines after `--color-ring: var(--ring);` (keep all existing entries intact):

```css
  /* New semantic colors */
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);

  /* Raw palette — Green */
  --color-green-50:  var(--green-50);
  --color-green-100: var(--green-100);
  --color-green-200: var(--green-200);
  --color-green-300: var(--green-300);
  --color-green-400: var(--green-400);
  --color-green-500: var(--green-500);
  --color-green-600: var(--green-600);
  --color-green-700: var(--green-700);
  --color-green-800: var(--green-800);
  --color-green-900: var(--green-900);
  --color-green-950: var(--green-950);

  /* Raw palette — Beige */
  --color-beige-50:  var(--beige-50);
  --color-beige-100: var(--beige-100);
  --color-beige-200: var(--beige-200);
  --color-beige-300: var(--beige-300);
  --color-beige-400: var(--beige-400);
  --color-beige-500: var(--beige-500);
  --color-beige-600: var(--beige-600);
  --color-beige-700: var(--beige-700);
  --color-beige-800: var(--beige-800);
  --color-beige-900: var(--beige-900);
  --color-beige-950: var(--beige-950);

  /* Raw palette — Neutral (override Tailwind's built-in `neutral-*` scale) */
  --color-neutral-50:  var(--neutral-50);
  --color-neutral-100: var(--neutral-100);
  --color-neutral-200: var(--neutral-200);
  --color-neutral-300: var(--neutral-300);
  --color-neutral-400: var(--neutral-400);
  --color-neutral-500: var(--neutral-500);
  --color-neutral-600: var(--neutral-600);
  --color-neutral-700: var(--neutral-700);
  --color-neutral-800: var(--neutral-800);
  --color-neutral-900: var(--neutral-900);
  --color-neutral-950: var(--neutral-950);

  /* Raw palette — Error */
  --color-error-50:  var(--error-50);
  --color-error-100: var(--error-100);
  --color-error-200: var(--error-200);
  --color-error-300: var(--error-300);
  --color-error-400: var(--error-400);
  --color-error-500: var(--error-500);
  --color-error-600: var(--error-600);
  --color-error-700: var(--error-700);
  --color-error-800: var(--error-800);
  --color-error-900: var(--error-900);
  --color-error-950: var(--error-950);

  /* Raw palette — Warning (override Tailwind built-in if any) */
  --color-warning-50:  var(--warning-50);
  --color-warning-100: var(--warning-100);
  --color-warning-200: var(--warning-200);
  --color-warning-300: var(--warning-300);
  --color-warning-400: var(--warning-400);
  --color-warning-500: var(--warning-500);
  --color-warning-600: var(--warning-600);
  --color-warning-700: var(--warning-700);
  --color-warning-800: var(--warning-800);
  --color-warning-900: var(--warning-900);
  --color-warning-950: var(--warning-950);

  /* Raw palette — Success */
  --color-success-50:  var(--success-50);
  --color-success-100: var(--success-100);
  --color-success-200: var(--success-200);
  --color-success-300: var(--success-300);
  --color-success-400: var(--success-400);
  --color-success-500: var(--success-500);
  --color-success-600: var(--success-600);
  --color-success-700: var(--success-700);
  --color-success-800: var(--success-800);
  --color-success-900: var(--success-900);
  --color-success-950: var(--success-950);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
```

NOTE on namespace collision: `--color-warning` (semantic) and `--color-warning-500` (raw) coexist. Tailwind v4 treats them as `warning` (no suffix → semantic) vs `warning-500` (with suffix → raw stop). This is intentional and matches the same pattern shadcn uses for `destructive`.

- [ ] **Step 4: Verify the file is syntactically valid**

Run: `pnpm dlx postcss styles/globals.css --no-map -o /tmp/check.css 2>&1 | head -20`

Expected: succeeds with no syntax errors (the file may not produce useful output without the full Next.js pipeline, but it must not error on CSS syntax).

Alternative if the above fails because of missing postcss config: run `pnpm tsc --noEmit` (CSS is not type-checked, so this passes regardless — but confirms the project still builds at type level).

- [ ] **Step 5: Commit**

```bash
git add styles/globals.css
git commit -m "feat(design-system): scaffold token architecture with placeholders

Two-layer system: raw palette (6 families × 11 stops, hex placeholders)
plus semantic tokens mapping primary→green-600, background→beige-50, etc.
Dark mode preserves existing values to keep ThemeToggle functional."
```

---

## Task 2: Showcase route scaffold

**Files:**
- Create: `app/(design-system)/design-system/page.tsx`
- Create: `app/(design-system)/design-system/_components/section.tsx`
- Create: `app/(design-system)/design-system/_components/showcase-nav.tsx`

- [ ] **Step 1: Create `Section` helper**

Create `app/(design-system)/design-system/_components/section.tsx`:

```tsx
import * as React from 'react';

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-12 border-b border-border last:border-b-0">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Create `ShowcaseNav` helper**

Create `app/(design-system)/design-system/_components/showcase-nav.tsx`:

```tsx
const SECTIONS = [
  { id: 'colors', label: 'Colors' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'misc', label: 'Misc' },
];

export function ShowcaseNav() {
  return (
    <nav className="sticky top-8 w-48 shrink-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <ul className="space-y-1">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: Create the page**

Create `app/(design-system)/design-system/page.tsx`:

```tsx
import { ShowcaseNav } from './_components/showcase-nav';
import { Section } from './_components/section';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <ShowcaseNav />
        <main className="flex-1 min-w-0">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Design System</h1>
            <p className="mt-2 text-muted-foreground">
              Tokens, components, and patterns for the riverside frontend.
            </p>
          </header>
          <Section id="colors" title="Colors" description="Raw palette and semantic tokens.">
            <p className="text-sm text-muted-foreground">Pending — added in Task 3.</p>
          </Section>
          <Section id="buttons" title="Buttons">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="forms" title="Forms">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="feedback" title="Feedback">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="overlays" title="Overlays">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="misc" title="Misc">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

Then `pnpm dev` and open http://localhost:3000/design-system.

Expected: page renders with sticky nav on left, 6 empty section placeholders on right. Clicking nav items scrolls smoothly to each section.

- [ ] **Step 5: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): add showcase route scaffold at /design-system"
```

---

## Task 3: Colors showcase section

**Files:**
- Create: `app/(design-system)/design-system/_components/color-swatch.tsx`
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Create `ColorSwatch`**

Create `app/(design-system)/design-system/_components/color-swatch.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface ColorSwatchProps {
  /** CSS variable name without the leading `--`, e.g. "green-500" or "primary" */
  token: string;
  label?: string;
}

export function ColorSwatch({ token, label }: ColorSwatchProps) {
  const [hex, setHex] = useState<string>('');

  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${token}`)
      .trim();
    setHex(value);
  }, [token]);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-12 w-full rounded-md border border-border"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <div className="text-xs text-foreground">{label ?? token}</div>
      <div className="text-[10px] font-mono text-muted-foreground uppercase">{hex || '—'}</div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the `colors` section in the page with a real grid**

In `app/(design-system)/design-system/page.tsx`, replace the body of `<Section id="colors" ...>` (the `<p>Pending...</p>` line) with this. Also add the import at the top: `import { ColorSwatch } from './_components/color-swatch';`

```tsx
<div className="space-y-8">
  {(['green', 'beige', 'neutral', 'error', 'warning', 'success'] as const).map((family) => (
    <div key={family}>
      <h3 className="mb-3 text-sm font-medium capitalize text-foreground">{family}</h3>
      <div className="grid grid-cols-11 gap-2">
        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((stop) => (
          <ColorSwatch key={stop} token={`${family}-${stop}`} label={`${family}-${stop}`} />
        ))}
      </div>
    </div>
  ))}

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Semantic tokens</h3>
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {[
        'background',
        'foreground',
        'card',
        'card-foreground',
        'popover',
        'popover-foreground',
        'primary',
        'primary-foreground',
        'secondary',
        'secondary-foreground',
        'muted',
        'muted-foreground',
        'accent',
        'accent-foreground',
        'destructive',
        'destructive-foreground',
        'warning',
        'warning-foreground',
        'success',
        'success-foreground',
        'border',
        'input',
        'ring',
      ].map((token) => (
        <ColorSwatch key={token} token={token} />
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

`pnpm dev`, open http://localhost:3000/design-system#colors.

Expected: 6 rows of 11 swatches each (all black until hex are filled in by the user) plus a semantic grid below. The hex labels read whatever is currently in the CSS vars. This proves the token plumbing works.

- [ ] **Step 4: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): colors showcase section reading from CSS vars"
```

---

## Task 4: Audit existing 8 components for semantic tokens only

The 8 existing components in `components/ui/` (button, button-group, select, alert, separator, sonner, toggle, tooltip) already mostly use shadcn semantic tokens (`bg-primary`, `text-foreground`, etc.). The audit ensures none reach into raw oklch or hardcoded color values.

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/button-group.tsx`
- Modify: `components/ui/select.tsx`
- Modify: `components/ui/alert.tsx`
- Modify: `components/ui/separator.tsx`
- Modify: `components/ui/sonner.tsx`
- Modify: `components/ui/toggle.tsx`
- Modify: `components/ui/tooltip.tsx`

- [ ] **Step 1: Grep for non-semantic color usage**

```bash
grep -nE "oklch|#[0-9a-fA-F]{3,8}|rgb\(|rgba\(" components/ui/*.tsx
```

Expected: NO output. If there are matches, replace each with the equivalent semantic token (e.g. a hardcoded white background → `bg-background`, a hardcoded red → `bg-destructive`). Show the file path and line for each replacement made.

- [ ] **Step 2: Grep for raw Tailwind palette references**

```bash
grep -nE "(bg|text|border|ring|fill|stroke)-(red|green|blue|yellow|orange|purple|pink|gray|slate|zinc|stone|amber|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose|lime)-[0-9]" components/ui/*.tsx
```

Expected: NO output. If anything matches (e.g. `bg-red-500`), replace with the matching semantic token (`bg-destructive`, `bg-warning`, `bg-success`).

- [ ] **Step 3: Add `warning` and `success` variants to alert**

Open `components/ui/alert.tsx`. The existing `destructive` variant is:

```ts
destructive:
  'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
```

Add two new entries in the same `variants.variant` object, mirroring the destructive pattern but swapping the color:

```ts
warning:
  'text-warning bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-warning/90',
success:
  'text-success bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-success/90',
```

Final variants block should be:

```ts
variant: {
  default: 'bg-card text-card-foreground',
  destructive:
    'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
  warning:
    'text-warning bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-warning/90',
  success:
    'text-success bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-success/90',
},
```

- [ ] **Step 4: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/
git commit -m "refactor(design-system): audit existing components for semantic-only tokens

Verified button, button-group, select, alert, separator, sonner, toggle,
tooltip use only semantic color tokens. Added warning/success variants
to alert."
```

---

## Task 5: Buttons showcase section

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Replace the `buttons` section body**

Add import at top: `import { Button } from '@/components/ui/button';`

Replace the `<Section id="buttons" ...>` body with:

```tsx
<div className="space-y-6">
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Variants</h3>
    <div className="flex flex-wrap gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  </div>
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Sizes</h3>
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  </div>
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">States</h3>
    <div className="flex flex-wrap gap-3">
      <Button>Idle</Button>
      <Button disabled>Disabled</Button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

`pnpm dev`, visit `/design-system#buttons`. Expected: all variants render in their new colors, all sizes are present, disabled state is visibly dimmed.

- [ ] **Step 3: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): buttons showcase section"
```

---

## Task 6: Install new Radix dependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install**

```bash
pnpm add @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-label
```

Expected: 6 packages added, lockfile updated.

- [ ] **Step 2: Verify build still works**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(design-system): add Radix deps for new components"
```

---

## Task 7: Add `Label` component

**Files:**
- Create: `components/ui/label.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/shadcn/utils';

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm font-medium leading-none text-foreground select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
```

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/label.tsx
git commit -m "feat(design-system): add Label component"
```

---

## Task 8: Add `Input` component

**Files:**
- Create: `components/ui/input.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'placeholder:text-muted-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/input.tsx
git commit -m "feat(design-system): add Input component"
```

---

## Task 9: Add `Textarea` component

**Files:**
- Create: `components/ui/textarea.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/textarea.tsx
git commit -m "feat(design-system): add Textarea component"
```

---

## Task 10: Add `Checkbox` component

**Files:**
- Create: `components/ui/checkbox.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/checkbox.tsx
git commit -m "feat(design-system): add Checkbox component"
```

---

## Task 11: Add `RadioGroup` component

**Files:**
- Create: `components/ui/radio-group.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs outline-none transition-[color,box-shadow]',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <Circle className="size-2 fill-primary text-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/radio-group.tsx
git commit -m "feat(design-system): add RadioGroup component"
```

---

## Task 12: Add `Switch` component

**Files:**
- Create: `components/ui/switch.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/shadcn/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-[background-color,box-shadow] outline-none',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background ring-0 shadow-sm transition-transform',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/switch.tsx
git commit -m "feat(design-system): add Switch component"
```

---

## Task 13: Forms showcase section

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Add imports + replace `forms` section body**

Add at top:

```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
```

Replace the `<Section id="forms" ...>` body with:

```tsx
<div className="grid gap-6 md:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="email-demo">Email</Label>
    <Input id="email-demo" type="email" placeholder="you@example.com" />
    <p className="text-xs text-muted-foreground">We never share your email.</p>
  </div>
  <div className="space-y-2">
    <Label htmlFor="bio-demo">Bio</Label>
    <Textarea id="bio-demo" placeholder="Tell us a bit about yourself..." />
  </div>
  <div className="space-y-2">
    <Label htmlFor="err-demo">Field with error</Label>
    <Input id="err-demo" aria-invalid placeholder="invalid input" />
    <p className="text-xs text-destructive">This field is required.</p>
  </div>
  <div className="flex items-center gap-3">
    <Checkbox id="cb-demo" />
    <Label htmlFor="cb-demo">Accept terms and conditions</Label>
  </div>
  <div className="space-y-3">
    <Label>Plan</Label>
    <RadioGroup defaultValue="pro" className="gap-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-free" value="free" />
        <Label htmlFor="rg-free">Free</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-pro" value="pro" />
        <Label htmlFor="rg-pro">Pro</Label>
      </div>
    </RadioGroup>
  </div>
  <div className="flex items-center gap-3">
    <Switch id="sw-demo" />
    <Label htmlFor="sw-demo">Enable notifications</Label>
  </div>
</div>
```

- [ ] **Step 2: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

`pnpm dev`, visit `/design-system#forms`. Expected: 6 form examples render correctly. Toggling checkbox, switch, radio shows the primary color. Aria-invalid input shows destructive ring.

- [ ] **Step 3: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): forms showcase section"
```

---

## Task 14: Add `Card` component

**Files:**
- Create: `components/ui/card.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm py-6',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 px-6', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/card.tsx
git commit -m "feat(design-system): add Card component"
```

---

## Task 15: Add `Badge` component

**Files:**
- Create: `components/ui/badge.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/shadcn/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none gap-1 transition-[color,box-shadow]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        outline: 'text-foreground border-border',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/badge.tsx
git commit -m "feat(design-system): add Badge component"
```

---

## Task 16: Add `Avatar` component

**Files:**
- Create: `components/ui/avatar.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/shadcn/utils';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/avatar.tsx
git commit -m "feat(design-system): add Avatar component"
```

---

## Task 17: Add `Skeleton` component

**Files:**
- Create: `components/ui/skeleton.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react';
import { cn } from '@/lib/shadcn/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/skeleton.tsx
git commit -m "feat(design-system): add Skeleton component"
```

---

## Task 18: Add `Dialog` component

**Files:**
- Create: `components/ui/dialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-opacity hover:opacity-100 opacity-70 focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none disabled:pointer-events-none"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1 text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/dialog.tsx
git commit -m "feat(design-system): add Dialog component"
```

---

## Task 19: Add `DropdownMenu` component

**Files:**
- Create: `components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        'px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/dropdown-menu.tsx
git commit -m "feat(design-system): add DropdownMenu component"
```

---

## Task 20: Add `Tabs` component

**Files:**
- Create: `components/ui/tabs.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/shadcn/utils';

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all outline-none',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'mt-2 outline-none',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm tsc --noEmit
git add components/ui/tabs.tsx
git commit -m "feat(design-system): add Tabs component"
```

---

## Task 21: Feedback showcase section

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Add imports + body**

Add imports:

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
```

Replace the `<Section id="feedback" ...>` body with:

```tsx
<div className="space-y-6">
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Alerts</h3>
    <div className="space-y-3">
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>This is the default alert.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Be careful with this action.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
      </Alert>
    </div>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Badges</h3>
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Tooltip</h3>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>This is a tooltip.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Toasts (sonner)</h3>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast('Default toast')}>Default</Button>
      <Button variant="outline" onClick={() => toast.success('Success!')}>Success</Button>
      <Button variant="outline" onClick={() => toast.error('Something failed')}>Error</Button>
    </div>
  </div>
</div>
```

NOTE: this section uses `onClick`, so add `'use client';` to the top of `page.tsx` (above all imports). If the page is already a client component, skip.

NOTE 2: ensure `<Toaster />` from `components/ui/sonner.tsx` is mounted somewhere in the layout — check `app/layout.tsx`. If not present, add it there as part of this task.

- [ ] **Step 2: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

`pnpm dev`, visit `/design-system#feedback`. Expected: all 4 alert variants render with their colors, all 6 badge variants, tooltip appears on hover, toast buttons fire toasts.

- [ ] **Step 3: Commit**

```bash
git add app/\(design-system\) app/layout.tsx
git commit -m "feat(design-system): feedback showcase section (alerts, badges, tooltip, toasts)"
```

---

## Task 22: Overlays showcase section

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Add imports + body**

Add imports:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

Replace the `<Section id="overlays" ...>` body with:

```tsx
<div className="space-y-6">
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Dialog</h3>
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. It will permanently delete the resource.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Dropdown menu</h3>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Tabs</h3>
    <Tabs defaultValue="account" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  </div>
</div>
```

- [ ] **Step 2: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

`pnpm dev`, visit `/design-system#overlays`. Expected: dialog opens with overlay + close button, dropdown opens on click with items, tabs switch content on click.

- [ ] **Step 3: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): overlays showcase section (dialog, dropdown, tabs)"
```

---

## Task 23: Misc showcase section

**Files:**
- Modify: `app/(design-system)/design-system/page.tsx`

- [ ] **Step 1: Add imports + body**

Add imports:

```tsx
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { ButtonGroup } from '@/components/ui/button-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

Replace the `<Section id="misc" ...>` body with:

```tsx
<div className="space-y-6">
  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Card</h3>
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Project</CardTitle>
        <CardDescription>An overview of your project.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Card body content goes here.</p>
      </CardContent>
    </Card>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Avatar</h3>
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>SC</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Skeleton</h3>
    <div className="space-y-2">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Separator</h3>
    <div>
      <p className="text-sm">Above</p>
      <Separator className="my-2" />
      <p className="text-sm">Below</p>
    </div>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Toggle</h3>
    <Toggle>Press me</Toggle>
  </div>

  <div>
    <h3 className="mb-3 text-sm font-medium text-foreground">Select</h3>
    <Select>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
        <SelectItem value="b">Option B</SelectItem>
        <SelectItem value="c">Option C</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

NOTE: `ButtonGroup` import is included in case it's used, but if `components/ui/button-group.tsx` exports a different name, adjust. Verify exports with `head components/ui/button-group.tsx`.

- [ ] **Step 2: Type-check + visual verify**

```bash
pnpm tsc --noEmit
```

`pnpm dev`, visit `/design-system#misc`. Expected: all components render with consistent radius and tokens.

- [ ] **Step 3: Commit**

```bash
git add app/\(design-system\)
git commit -m "feat(design-system): misc showcase section"
```

---

## Task 24: Final verification + build

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: no errors. If there are warnings about unused imports in `page.tsx`, fix them.

- [ ] **Step 3: Production build**

```bash
pnpm build
```

Expected: build succeeds. The `/design-system` route should appear in the route table.

- [ ] **Step 4: Visual smoke test**

`pnpm dev`. Open http://localhost:3000/design-system. Walk through each of the 6 sections. Confirm:
- Colors section: 6 families × 11 swatches + semantic grid all render. Hex labels show `#000000` for any family the user has not yet provided values for. This is expected.
- Buttons section: 6 variants × 4 sizes, disabled state visible.
- Forms section: all inputs interactive, aria-invalid styling visible, checkbox/switch/radio show primary color when active.
- Feedback section: 4 alerts, 6 badges, tooltip on hover, toast buttons fire.
- Overlays section: dialog opens with overlay, dropdown opens, tabs switch.
- Misc section: card, avatar, skeleton, separator, toggle, select all render correctly.

Also verify the main app routes still work — visit `/` and ensure nothing visually regressed (the existing pages use `bg-background`, `text-foreground`, `bg-primary`, etc., which are still defined; they will look slightly different because the semantic tokens now resolve via the new palette, but should not be broken).

- [ ] **Step 5: Final commit**

If anything was fixed in steps 1–4:

```bash
git add -A
git commit -m "chore(design-system): final verification fixes"
```

- [ ] **Step 6: Summary**

The design system foundation is in place. Remaining follow-up work, NOT part of this plan:
- User fills in hex values family by family in `styles/globals.css`.
- Dark mode token remap (currently dark mode still uses shadcn defaults).
- Typography / spacing / shadow tokens.
- Additional components (Table, Calendar, Command, etc.) as needed.

---

## Hex Backfill (incremental, runs in parallel with above tasks)

This is not a task but a process. Whenever the user provides a family's hex values, edit `styles/globals.css` directly:

1. Locate the family block (e.g. `/* Green */`).
2. Replace the 11 `#000000` placeholders with the provided hex values in order (50 → 950).
3. Visit `/design-system#colors` to verify the swatches now show the correct hex labels and colors.
4. Commit:

```bash
git add styles/globals.css
git commit -m "feat(design-system): fill <family> palette hex values"
```

This can happen at any point after Task 1 completes. The plan tasks do not block on this.
