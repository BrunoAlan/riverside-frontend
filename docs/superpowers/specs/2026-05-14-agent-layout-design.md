# Agent Layout Design

## Goal

Create a shared layout for all pages under `/agent` (currently the voice concierge experience) that establishes a consistent visual frame: a cream background with the Riverside logo centered in a sage-green card at the top.

The layout is purpose-built for an "app-like" experience — full-viewport height, no page scroll, minimal chrome — distinct from the marketing home layout.

## Reference

Mockup shared in conversation: cream/beige page background, a small sage-green rectangular card centered horizontally at the top containing the Riverside logo, and the page content (e.g., welcome card) rendered below in the remaining space.

## Architecture

### New files

**`app/agent/layout.tsx`** — Next.js segment layout (server component). Wraps every route under `/agent/*`. Provides the cream background container, fixes viewport height, and renders `AgentHeader` above `{children}`.

**`components/agent/agent-header.tsx`** — Server component. Renders the sage-green card with the Riverside logo. Decorative only: no link, no nav buttons, no interactivity.

### Modified files

**`components/app/welcome-view.tsx`** — Remove `bg-background` from the inner `<section>` so the welcome card inherits the cream background from the layout instead of painting a white rectangle on top.

## Structure

```tsx
// app/agent/layout.tsx
export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-beige-200">
      <AgentHeader />
      <main className="min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

```tsx
// components/agent/agent-header.tsx
export function AgentHeader() {
  return (
    <div className="flex justify-center">
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

## Design tokens

- **Background:** `bg-beige-200` (`#f3ede7`) — matches the cream tone the user selected from `styles/globals.css:24`.
- **Header card:** sage tint via existing `--green-300` (`#cfd8d0`) at reduced opacity, to match the soft olive-green shown in the mockup. Final opacity value to be confirmed visually during implementation.
- **Logo asset:** existing `/public/riverside-logo.svg`.

## Layout behavior

- Root container is `h-screen flex flex-col` — fixed to viewport height, no document scroll.
- `<main>` uses `flex-1 min-h-0 overflow-hidden` so children that need their own scroll (e.g., chat transcripts) can scroll internally without leaking to the page.
- Header has natural height; content fills the rest.

## Scope and non-goals

**In scope:**
- The layout file, the header component, and the `welcome-view` background fix.

**Out of scope (YAGNI):**
- Navigation links, exit/back button, menu, theme toggle.
- Mobile-specific header variants — the existing logo sizing should be acceptable; revisit if visual QA flags it.
- Animations or transitions.
- Changes to home or other routes — this layout applies only within `/agent`.

## Verification

- `/agent` renders with cream background, sage logo card at top, welcome content centered below, no page scroll.
- No regression on `/` (home) — the layout is scoped to the `/agent` segment.
- Type check (`tsc --noEmit`) and lint pass.
- Visual check in browser at desktop and a narrow viewport (e.g., 375px).
