# Agent instructions

This file is the entry point for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in this repo.

## Read first

1. [`README.md`](./README.md) — what the project is, stack, and how to run it.
2. [`conventions/`](./conventions/) — how we work in this codebase. Everything below is a pointer into that folder.

## Conventions index

| Topic                 | File                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| Code style & patterns | [`conventions/code-style.md`](./conventions/code-style.md)             |
| Project layout        | [`conventions/project-layout.md`](./conventions/project-layout.md)     |
| Agent-driven UI flow  | [`conventions/agent-ui.md`](./conventions/agent-ui.md)                 |
| Adding a UI command   | [`conventions/adding-a-command.md`](./conventions/adding-a-command.md) |
| Adding a view + mock  | [`conventions/adding-a-view.md`](./conventions/adding-a-view.md)       |
| Testing               | [`conventions/testing.md`](./conventions/testing.md)                   |
| Git workflow          | [`conventions/git-workflow.md`](./conventions/git-workflow.md)         |

## Hard rules

- **Package manager:** `pnpm`. Never invoke `npm` or `yarn`.
- **Never edit `components/ui/`** by hand. Those are shadcn primitives — re-add via the shadcn CLI if you need a new one.
- **`app-config.ts` is the only place** for branding, feature flags, and visualizer presets. Don't hardcode copy or colors elsewhere.
- **Don't reach into LiveKit transport details** outside `lib/agent-ui/transport.ts`. The rest of the app talks to `uiViewStore`.
- **Tests live next to the code** they cover (`foo.ts` ↔ `foo.test.ts`).
- **Don't commit secrets.** `.env.local` is gitignored — keep it that way.

## When in doubt

- Match an existing pattern in the same folder before inventing a new one.
- If a convention file disagrees with code on `main`, the code wins — open a PR to fix the doc.
