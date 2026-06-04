# Code style

## TypeScript

- **`strict` is on.** No `any`, no non-null assertions (`!`) unless you can justify them in a comment.
- Prefer `type` over `interface` for plain shapes; use `interface` when you genuinely need extension/declaration merging.
- Discriminated unions over enums (see `UiView` in `lib/agent-ui/ui-view-types.ts`).
- Use `import type { ... }` for type-only imports.
- Path alias: `@/*` resolves to the repo root. Use it instead of long relative paths.

## React

- Server Components by default. Add `'use client'` only when the file needs hooks, event handlers, or browser APIs.
- One component per file. The filename matches the export.
- Props: destructure inline in the parameter list. No `props.foo` indirection.
- Hooks live in `hooks/` if cross-cutting, or alongside the feature if local. Always `use-kebab-case.ts`.

## Reuse & abstraction

- Scroll containers with top/bottom fade overlays: use `useScrollFade` (`hooks/use-scroll-fade.ts`) for the edge detection — don't re-implement the scroll/resize listeners. Keep the gradient `<div>`s inline in each consumer, since their size, color, and offsets differ per layout.

## File naming

- React components: `kebab-case.tsx`, default-export only if the file is a Next.js route entry; otherwise named exports.
- Non-component TS modules: `kebab-case.ts`.
- Tests: same name as the source, with `.test.ts` / `.test.tsx`.

## State

- Cross-component state goes through `zustand` stores in `lib/`. The store file owns the types.
- Don't pull state via `useState` if the same value is in a store — read it from the store.
- The agent-UI store is the canonical example: `lib/agent-ui/ui-view-store.ts`.

## Styling

- Tailwind first. Compose with `cn()` from `lib/shadcn`.
- No inline `style={{ ... }}` except for dynamic values that can't be expressed as classes (e.g. a computed transform).
- Colors and accents come from `app-config.ts` or Tailwind tokens, never hex literals in component code.

## Imports order

Enforced by Prettier + ESLint. Don't reorder by hand:

1. React / Next / external packages
2. `@/lib`, `@/hooks`, `@/components`
3. Relative imports
4. Type-only imports last within each group

## Comments

Default: no comments. Write one only when the **why** is non-obvious (a constraint, a workaround, a subtle invariant). Don't restate what the code does.
