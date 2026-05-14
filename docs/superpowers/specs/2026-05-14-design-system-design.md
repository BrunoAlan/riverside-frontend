# Design System — Spec

**Date:** 2026-05-14
**Project:** riverside-frontend (agent-starter-react)
**Approach:** Customize on top of shadcn/ui (option 2 from brainstorming)

## 1. Goal

Build a custom design system on top of the existing shadcn/ui foundation. Keep shadcn's architecture (Radix primitives + CVA + `cn()` helper + components living in `components/ui`), but replace the visual layer with our own color tokens, semantic mapping, variants, and conventions. Also expand the component set from the current 8 to a full base of 21 components, and ship a showcase page to preview them.

Out of scope for this spec: typography tokens, spacing tokens, shadow tokens, custom icons, animations, data components (Table/DataGrid/Calendar). Defaults stay.

## 2. Decisions (from brainstorming)

- **Strategy:** Customize on top of shadcn (not full rewrite, not a separate package).
- **Tokens in scope:** Colors only. Typography, spacing, radii, shadows keep shadcn/Tailwind defaults.
- **Color palette structure:** Raw scale (6 families × 11 stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) → semantic tokens.
- **Color families:** Green, Beige, Neutral, Error, Warning, Success.
- **Semantic mapping:** Green = primary (brand), Beige = secondary/accent, Neutral = grays, Error/Warning/Success = state colors.
- **Dark mode:** Light only for now. Stub `.dark { }` block left empty with TODO for later.
- **Component scope:** Restyle 8 existing + add 13 new = 21 total.
- **Showcase:** Single page at `/design-system` with anchored sections.
- **Hex values:** User will provide hex values family by family. Components can be built in parallel because they consume semantic tokens, not raw hex.

## 3. Token Architecture

Two-layer system in `app/globals.css`:

### Layer 1 — Raw palette

CSS variables prefixed by family, all 11 stops per family:

```css
:root {
  --green-50:   #...; --green-100:  #...; --green-200:  #...;
  --green-300:  #...; --green-400:  #...; --green-500:  #...;
  --green-600:  #...; --green-700:  #...; --green-800:  #...;
  --green-900:  #...; --green-950:  #...;
  /* same for beige, neutral, error, warning, success */
}
```

Until the user provides hex values for a family, that family's stops are placeholders (`#000000`). Filling them in is incremental and does not block component work.

### Layer 2 — Semantic tokens

Components only consume these — never raw palette directly:

```css
:root {
  --background: var(--beige-50);
  --foreground: var(--neutral-950);

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

  --card: var(--neutral-50);
  --card-foreground: var(--neutral-950);

  --popover: var(--neutral-50);
  --popover-foreground: var(--neutral-950);

  --radius: 0.5rem;
}

.dark {
  /* TODO: dark mode token overrides — same set of semantic vars
     remapped to darker raw stops. Not implemented yet. */
}
```

The specific stop chosen for each semantic role (e.g. primary = green-600) is a starting proposal — adjustable once real hex values are visible.

### Tailwind v4 exposure

The project uses Tailwind v4 via `@tailwindcss/postcss`. Expose both raw and semantic tokens to Tailwind in `globals.css` using `@theme inline`, so utilities like `bg-primary`, `text-foreground`, `border-border`, `bg-green-500`, `text-beige-700` all work.

## 4. Component Strategy

### Pattern (consistent across all 21 components)

- Radix primitive (or native HTML if no Radix equivalent) for behavior/a11y
- `class-variance-authority` for variants
- `cn()` helper from `@/lib/shadcn/utils` for class merging
- `className` always overridable, forwarded last
- File location: `components/ui/<name>.tsx`
- Components consume only semantic tokens, never raw palette

### Components

**Existing — restyle to new tokens (8):**
button, button-group, select, alert, separator, sonner, toggle, tooltip

**New — add (13):**

- Forms: label, input, textarea, checkbox, radio-group, switch
- Layout/content: card, badge, avatar, skeleton
- Overlays: dialog, dropdown-menu, tabs

### Conventions

- **Radius:** single `--radius` token (default `0.5rem`). Components use `rounded-md`/`rounded-lg` derived from it.
- **Focus ring:** all interactive components use `--ring` (green) with consistent width and offset.
- **Disabled state:** `opacity-50 pointer-events-none` everywhere.
- **Sizes:** `sm`, `md` (default), `lg` where applicable, with a shared padding scale across Button / Input / Select.
- **Button variants:** `default` (primary), `secondary`, `outline`, `ghost`, `destructive`, `link`.
- **Badge / Alert variants:** `default`, `secondary`, `destructive`, `warning`, `success`.

## 5. Showcase Page

**Route:** `app/(design-system)/design-system/page.tsx` (route group to keep it isolated from the main app layout).

**Structure:** single page, sticky side nav with anchors for each section.

**Sections:**

1. **Colors** — grid of 6 families × 11 stops with hex value labels (reading from CSS vars at runtime). Below: semantic tokens with previews.
2. **Buttons** — every variant × every size × states (default, hover, disabled, loading).
3. **Forms** — input, textarea, label, checkbox, radio, switch, select — with label, description, error examples.
4. **Feedback** — alert (each variant), badge (each variant), tooltip, sonner (button to fire each toast type).
5. **Overlays** — dialog, dropdown-menu, tabs — buttons that open them.
6. **Misc** — separator, card, avatar, skeleton, toggle, button-group.

**Helpers** live in `app/(design-system)/design-system/_components/` (e.g. `ColorSwatch`, `Section`).

**Visibility:** not linked from the main app nav. Accessed by visiting `/design-system` directly.

## 6. File Layout

```
app/
  globals.css                              # raw palette + semantic tokens + @theme inline
  (design-system)/
    design-system/
      page.tsx                             # showcase
      _components/                         # ColorSwatch, Section, etc.
components/
  ui/                                      # 21 components total
lib/
  shadcn/
    utils.ts                               # cn() — already exists
docs/
  superpowers/
    specs/
      2026-05-14-design-system-design.md   # this spec
```

## 7. Build Order

Each step is independently verifiable.

1. **Raw tokens scaffold** — add the 6 families × 11 stops to `globals.css` with `#000000` placeholders. User fills hex per family as they arrive.
2. **Semantic tokens + Tailwind exposure** — map semantic vars, add `@theme inline`, stub empty `.dark { }`.
3. **Restyle existing 8 components** — button, button-group, select, alert, separator, sonner, toggle, tooltip — switch to semantic tokens.
4. **Add new 13 components**, in order:
   - Forms: label → input → textarea → checkbox → radio-group → switch
   - Layout: card → badge → avatar → skeleton
   - Overlays: dialog → dropdown-menu → tabs
5. **Showcase page** — build the 6 sections progressively.
6. **Verification** — TypeScript passes, `pnpm build` succeeds, `/design-system` renders correctly in the browser, all variants visually inspected.

The hex-value bottleneck only blocks the visual review of step 6. Steps 2–5 progress in parallel using placeholders, because components only depend on semantic tokens.

## 8. New Dependencies

To install:

- `@radix-ui/react-checkbox`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-avatar`
- `@radix-ui/react-label`

Already in `package.json` (no install needed): dialog, dropdown-menu, popover, separator, select, toggle, tooltip, collapsible, hover-card, progress, scroll-area, slot.

## 9. Out of Scope

Explicitly NOT in this spec (may be follow-up specs later):

- Custom typography tokens / font choices
- Custom spacing/sizing tokens
- Custom shadow / elevation tokens
- Custom icon set (lucide stays)
- Dark mode token values (stub only)
- Animation / motion tokens
- Data components: Table, DataGrid, Calendar, Date Picker, Command palette, Carousel
- Storybook or external documentation tooling
- Visual regression testing
