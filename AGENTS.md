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
| Analytics events      | [`conventions/analytics.md`](./conventions/analytics.md)               |
| Testing               | [`conventions/testing.md`](./conventions/testing.md)                   |
| Git workflow          | [`conventions/git-workflow.md`](./conventions/git-workflow.md)         |

## Hard rules

- **Package manager:** `pnpm`. Never invoke `npm` or `yarn`.
- **Never edit `components/ui/`** by hand. Those are shadcn primitives — re-add via the shadcn CLI if you need a new one.
- **`app-config.ts` is the only place** for branding, feature flags, and visualizer presets. Don't hardcode copy or colors elsewhere.
- **Don't reach into LiveKit transport details** outside `lib/agent-ui/transport.ts`. The rest of the app talks to `uiViewStore`.
- **Tests live next to the code** they cover (`foo.ts` ↔ `foo.test.ts`).
- **Don't commit secrets.** `.env.local` is gitignored — keep it that way.
- **Never push to `main` (direct or via PR merge) without a clean `pnpm lint` and `pnpm test`.** Run both locally, confirm they pass, and only then push or merge. If either fails, fix the root cause — don't disable rules, skip tests, or use `--no-verify` to bypass.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
