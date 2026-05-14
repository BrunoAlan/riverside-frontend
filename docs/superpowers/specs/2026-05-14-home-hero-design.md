# Home Hero — Design Spec

**Date:** 2026-05-14
**Status:** Approved (brainstorming)
**Scope:** Above-the-fold hero of the marketing home page for Riverside Luxury Cruises.

## Goal

Replace the current `app/page.tsx` (which renders the LiveKit `<App />`) with a marketing home page whose first deliverable is the hero section shown in the reference mockup. The existing `<App />` moves to `/agent`.

Only the hero (single viewport) is in scope for this iteration. Subsequent home sections (destinations, ships, experiences, footer) are out of scope.

## Reference

Mockup provided by user (Riverside Luxury Cruises hero):

- Top utility bar (cream background): `US [$]`, mail icon + `MY GUESTS`, flag + `ENGLISH`, person icon + `MY ACCOUNT`, search icon + `CONTACT`, phone icon + `+1 (0) 833 305 3313`, vertical separator, `TRAVEL AGENTS`.
- Primary navigation row (cream background): `≡ MENU` on the left, centered logo (`RIVERSIDE LUXURY CRUISES` seahorse mark) overflowing below the bar, `VIRTUAL CONCIERGE` (outline pill) and `CRUISE FINDER` (solid dark-green pill) on the right.
- Hero canvas: full-bleed image background with a subtle dark overlay; title `RIVERSIDE LUXURY CRUISES` in serif, left-aligned, vertically centered.
- Floating actions column on the right edge: magnifying glass, person, camera icon buttons stacked.

## Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Scope | Only the hero (single viewport). |
| Routing | New home replaces `app/page.tsx`. LiveKit `<App />` moves to `app/agent/page.tsx`. |
| Hero media | Static image at `public/hero-image.jpg`. No video. |
| CTAs | Most are visual stubs (`href="#"`). Only `VIRTUAL CONCIERGE` links to `/agent`. |
| Fonts | Add `Source Serif 4` (Google Fonts) as stand-in for Newzald, via `next/font/google` in `app/layout.tsx` (var `--font-serif`). UI sans uses existing Inter. |
| Responsive | Basic. Layout doesn't break < 768px; non-essential top-bar items, floating actions, and "Virtual Concierge" CTA hide on small screens. No mobile drawer for MENU (stub only). |
| Component grouping | Non-primitive components grouped by feature under `components/home/`. Primitives in `components/ui/` are not modified. |
| Icons | `@phosphor-icons/react` (already a dependency). |

## File Plan

**Create**
- `components/home/hero.tsx` — composition; no logic.
- `components/home/top-utility-bar.tsx` — top cream bar with utility links.
- `components/home/primary-nav.tsx` — MENU + centered logo + Virtual Concierge / Cruise Finder CTAs.
- `components/home/floating-actions.tsx` — right-edge icon column.
- `app/agent/page.tsx` — renders the existing `<App />` (moved from `app/page.tsx`).

**Modify**
- `app/page.tsx` — replace body with `<Hero />`.
- `app/layout.tsx` — add `Source_Serif_4` via `next/font/google`, expose as `--font-serif`, add to `<html>` className.

**Untouched**
- `components/ui/*` (primitives).
- `components/app/*`, `components/chat/*`, `components/agents-ui/*`, `components/ai-elements/*`.

## Component Contracts

### `Hero` (`components/home/hero.tsx`)
- Server component. No props.
- Renders a full-viewport `relative` container (`min-h-screen`) with:
  - `<Image src="/hero-image.jpg" fill priority sizes="100vw" alt="" />` background.
  - Overlay `<div className="absolute inset-0 bg-black/20" />` for legibility.
  - On top: `<TopUtilityBar />` and `<PrimaryNav />` stacked at top, centered serif `<h1>` left-aligned within max-width container, `<FloatingActions />` pinned to right edge (hidden < md).

### `TopUtilityBar` (`components/home/top-utility-bar.tsx`)
- Server component. No props.
- Renders a horizontal flex row with `bg-[#EFE9DF]` (cream — exact token TBD-from-mockup, see Open Items), height ~36px, text `text-xs uppercase tracking-wide`.
- Items: country/currency, mail+MY GUESTS, flag+ENGLISH, person+MY ACCOUNT, search+CONTACT, phone+number, `<Separator orientation="vertical" />`, TRAVEL AGENTS.
- All items are `<a href="#">` stubs.
- Responsive: hide `MY GUESTS`, `CONTACT`, phone, separator, `TRAVEL AGENTS` below `md`.

### `PrimaryNav` (`components/home/primary-nav.tsx`)
- Server component. No props.
- Cream background, height ~80px. Holds:
  - `<Button variant="ghost">` with list icon + `MENU` text (left).
  - Centered logo: `<Image src="/riverside-logo.svg" />` absolutely positioned to overflow the bar by ~30px downward, so the seahorse hangs over the hero image.
  - Right cluster: `<Button asChild variant="outline" className="rounded-full"><Link href="/agent">VIRTUAL CONCIERGE</Link></Button>` and `<Button className="rounded-full">CRUISE FINDER</Button>`.
- Responsive: hide `VIRTUAL CONCIERGE` below `sm`; logo shrinks; MENU and CRUISE FINDER stay.

### `FloatingActions` (`components/home/floating-actions.tsx`)
- Server component for now. Kept isolated so a future client-side behavior (hover, tooltip, click handlers) can be added without touching `Hero`.
- Absolutely positioned (`absolute right-4 top-1/2 -translate-y-1/2`) column of three `<Button variant="ghost" size="icon">` wrapping Phosphor `MagnifyingGlass`, `User`, `Camera`. Each rounded full, white/translucent background for contrast on the image.
- Hidden below `md`.

## Typography & Layout

- `app/layout.tsx`: add
  ```ts
  import { Source_Serif_4 } from 'next/font/google';
  const sourceSerif = Source_Serif_4({ variable: '--font-serif', subsets: ['latin'] });
  ```
  and append `sourceSerif.variable` to the `<html>` className list.
- Tailwind utility for the serif: title uses `font-[family-name:var(--font-serif)] text-5xl md:text-7xl text-white tracking-wide`.
- Title placement: inside a `container mx-auto` block, vertically centered within the hero, left-aligned, max two lines (`RIVERSIDE LUXURY` / `CRUISES`).

## Responsive Behavior (≥/< 768px)

| Element | Desktop (≥ md) | Mobile (< md) |
| --- | --- | --- |
| Top utility bar | All items | Currency, language, MY ACCOUNT only |
| MENU | Visible | Visible (stub, no drawer) |
| Logo | Full size, centered | Reduced size, centered |
| Virtual Concierge | Visible | Hidden |
| Cruise Finder | Visible | Visible |
| Floating actions | Visible | Hidden |
| Title | `text-7xl` | `text-5xl` |

## Open Items / Assumptions

- **Cream color token:** Mockup shows a warm off-white. Will sample the screenshot for an approximate hex and inline it (e.g., `bg-[#EFE9DF]`); not adding to the design-system token set in this iteration to keep scope tight.
- **Dark green CTA color:** Same approach — sample from mockup, inline. Not promoting to a token yet.
- **Country flag:** The mockup shows the UK flag in the language switcher. Will use an inline SVG or a Phosphor flag substitute (Phosphor doesn't ship country flags — falling back to a small inline SVG of the Union Jack).
- **`MENU` drawer:** Out of scope; button is a stub.
- **Logo height/overflow value:** Approximate (~30px overflow); exact value tuned visually during implementation.

## Non-Goals

- Below-the-fold content (destinations, ships, footer).
- Real menu drawer or working country/language switcher.
- Real Cruise Finder / Search / My Account flows.
- I18n infrastructure.
- Analytics, SEO metadata beyond what `layout.tsx` already provides.

## Acceptance

- Visiting `/` renders the hero matching the mockup at desktop widths.
- Clicking `VIRTUAL CONCIERGE` navigates to `/agent` and renders the existing LiveKit `<App />`.
- All other links/buttons render without errors but do not navigate (or navigate to `#`).
- At `< 768px`, the hero layout does not overflow horizontally; non-essential items are hidden as described.
- `pnpm lint` and `pnpm build` succeed.
